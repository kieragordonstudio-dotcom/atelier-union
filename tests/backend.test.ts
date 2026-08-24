import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import session from 'express-session';
import { DateTime } from 'luxon';
import request from 'supertest';
import { createApp } from '../server/app.js';
import {
  appointments,
  businessMemberships,
  clients,
  timeOff,
  users,
  workingHours,
} from '../server/db/schema.js';
import { ConflictError } from '../server/errors.js';
import { updateAppointment } from '../server/services/adminAppointments.js';
import {
  createAppointment,
  normalizeEmail,
  normalizePhone,
  rangesOverlap,
} from '../server/services/appointments.js';
import { calculateAvailability } from '../server/services/availability.js';
import { createTestDatabase, seedBookingSetup, seedBusiness } from './helpers/database.js';

const config = {
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  SESSION_SECRET: 'test-session-secret-that-is-longer-than-thirty-two-characters',
  KGD_ADMIN_EMAIL: 'owner@example.com',
  KGD_ADMIN_PASSWORD: 'a-secure-test-password',
  NODE_ENV: 'test' as const,
  PORT: 3001,
};

test('normalisation and overlap helpers reject duplicate identities and overlapping ranges', () => {
  assert.equal(normalizeEmail('  OWNER@Example.COM '), 'owner@example.com');
  assert.equal(normalizePhone('+44 (0) 1224 555 123'), '+4401224555123');
  assert.equal(rangesOverlap(new Date(0), new Date(100), new Date(99), new Date(200)), true);
  assert.equal(rangesOverlap(new Date(0), new Date(100), new Date(100), new Date(200)), false);
});

test('authentication rejects bad credentials and admin authorization enforces the session tenant', async () => {
  const context = await createTestDatabase();
  try {
    const businessA = await seedBusiness(context, { slug: 'atelier-union', name: 'Atelier Union' });
    const businessB = await seedBusiness(context, { slug: 'other-salon', name: 'Other Salon' });
    const [owner] = await context.db.insert(users).values({
      email: 'owner@example.com',
      normalizedEmail: 'owner@example.com',
      passwordHash: await hash('correct-password-123', 4),
    }).returning();
    await context.db.insert(businessMemberships).values({ businessId: businessA.id, userId: owner.id, role: 'owner' });
    await context.db.insert(clients).values([
      { businessId: businessA.id, name: 'Atelier Client', email: 'atelier@example.com', normalizedEmail: 'atelier@example.com' },
      { businessId: businessB.id, name: 'Other Client', email: 'other@example.com', normalizedEmail: 'other@example.com' },
    ]);

    const app = createApp(config, context, { sessionStore: new session.MemoryStore(), serveFrontend: false });
    const anonymous = request(app);
    assert.equal((await anonymous.get('/api/admin/clients')).status, 401);

    const agent = request.agent(app);
    const sessionResponse = await agent.get('/api/auth/session').expect(200);
    const csrfToken = sessionResponse.body.csrfToken as string;
    const rejected = await agent.post('/api/auth/login').set('x-csrf-token', csrfToken).send({ email: 'owner@example.com', password: 'wrong-password' });
    assert.equal(rejected.status, 401);
    assert.equal(rejected.body.error.code, 'LOGIN_REJECTED');

    await agent.post('/api/auth/login').set('x-csrf-token', csrfToken).send({ email: 'owner@example.com', password: 'correct-password-123' }).expect(200);
    const listed = await agent.get('/api/admin/clients').expect(200);
    assert.equal(listed.body.clients.length, 1);
  } finally {
    await context.pool.end();
  }
});

test('availability observes working hours and time off', async () => {
  const context = await createTestDatabase();
  try {
    const business = await seedBusiness(context, { slug: 'atelier-union', name: 'Atelier Union' });
    const { artist } = await seedBookingSetup(context, business.id);
    const date = DateTime.now().setZone('Europe/London').plus({ days: 5 }).startOf('day');
    await context.db.insert(workingHours).values({ businessId: business.id, artistId: artist.id, dayOfWeek: date.weekday, startTime: '09:00', endTime: '12:00' });

    const available = await calculateAvailability(context.db, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', addOnSlugs: [], productOn: 'none', from: date.toISODate()!, to: date.toISODate()! });
    assert.ok(available.slots.length >= 3);
    assert.equal(available.days[0].status, 'good');

    await context.db.insert(timeOff).values({ businessId: business.id, artistId: artist.id, startsAt: date.toUTC().toJSDate(), endsAt: date.endOf('day').toUTC().toJSDate(), reason: 'Annual leave' });
    const blocked = await calculateAvailability(context.db, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', addOnSlugs: [], productOn: 'none', from: date.toISODate()!, to: date.toISODate()! });
    assert.equal(blocked.slots.length, 0);
    assert.equal(blocked.days[0].status, 'full');
  } finally {
    await context.pool.end();
  }
});

test('booking creation prevents overlap, matches clients, and supports cancellation', async () => {
  const context = await createTestDatabase();
  try {
    const business = await seedBusiness(context, { slug: 'atelier-union', name: 'Atelier Union' });
    const { artist } = await seedBookingSetup(context, business.id);
    const date = DateTime.now().setZone('Europe/London').plus({ days: 6 }).startOf('day');
    await context.db.insert(workingHours).values({ businessId: business.id, artistId: artist.id, dayOfWeek: date.weekday, startTime: '09:00', endTime: '14:00' });
    const availability = await calculateAvailability(context.db, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', addOnSlugs: [], productOn: 'none', from: date.toISODate()!, to: date.toISODate()! });
    const firstSlot = availability.slots.find((slot) => slot.time === '09:00')!;
    const secondSlot = availability.slots.find((slot) => slot.time === '10:00')!;
    const customer = { fullName: 'Kiera Gordon', email: 'KIERA@example.com', mobile: '+44 7700 900123', note: 'First visit' };

    const first = await createAppointment(context.db, context.pool, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', startsAt: firstSlot.startsAt, addOnSlugs: [], productOn: 'none', customer }, 'public');
    await assert.rejects(
      createAppointment(context.db, context.pool, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', startsAt: firstSlot.startsAt, addOnSlugs: [], productOn: 'none', customer }, 'public'),
      (error: unknown) => error instanceof ConflictError,
    );
    const second = await createAppointment(context.db, context.pool, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', startsAt: secondSlot.startsAt, addOnSlugs: [], productOn: 'none', customer: { ...customer, email: 'kiera@example.com', note: '' } }, 'admin');
    const clientRows = await context.db.select().from(clients).where(eq(clients.businessId, business.id));
    assert.equal(clientRows.length, 1);
    assert.equal(first.clientId, second.clientId);

    await updateAppointment(context.pool, business.id, first.id, { status: 'cancelled' });
    const [cancelled] = await context.db.select().from(appointments).where(eq(appointments.id, first.id));
    assert.equal(cancelled.status, 'cancelled');
    assert.ok(cancelled.cancelledAt instanceof Date);
  } finally {
    await context.pool.end();
  }
});

test('the production migration includes database-level overlap protection', () => {
  const migration = new URL('../migrations/0000_empty_colleen_wing.sql', import.meta.url);
  const text = readFileSync(migration, 'utf8');
  assert.match(text, /appointments_no_artist_overlap/);
  assert.match(text, /EXCLUDE USING gist/);
});
