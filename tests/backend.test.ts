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
  businessSettings,
  clients,
  lookbookEntries,
  payments,
  services,
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
    const { artist } = await seedBookingSetup(context, businessA.id);
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

    const login = await agent.post('/api/auth/login').set('x-csrf-token', csrfToken).send({ identifier: 'owner@example.com', password: 'correct-password-123' }).expect(200);
    const authenticatedCsrfToken = login.body.csrfToken as string;
    assert.notEqual(authenticatedCsrfToken, csrfToken);
    const startsAt = DateTime.now().setZone('Europe/London').plus({ days: 2 }).startOf('hour');
    const blockPayload = {
      artistId: artist.id,
      type: 'blocked',
      startsAt: startsAt.toISO(),
      endsAt: startsAt.plus({ hours: 1 }).toISO(),
      reason: 'CSRF regression check',
    };
    await agent.post('/api/admin/time-off').set('x-csrf-token', csrfToken).send(blockPayload).expect(403);
    const createdBlock = await agent.post('/api/admin/time-off').set('x-csrf-token', authenticatedCsrfToken).send(blockPayload).expect(201);
    const listed = await agent.get('/api/admin/clients').expect(200);
    assert.equal(listed.body.clients.length, 1);
    await agent.delete(`/api/admin/time-off/${createdBlock.body.timeOff.id}`).set('x-csrf-token', authenticatedCsrfToken).expect(204);
    await agent.post('/api/auth/logout').set('x-csrf-token', authenticatedCsrfToken).expect(204);
    await agent.get('/api/admin/clients').expect(401);

    const guestAgent = request.agent(app);
    const guestSession = await guestAgent.get('/api/auth/session').expect(200);
    const guestLogin = await guestAgent.post('/api/auth/guest')
      .set('x-csrf-token', guestSession.body.csrfToken)
      .expect(200);
    assert.equal(guestLogin.body.user.role, 'guest');
    assert.equal((await guestAgent.get('/api/auth/session').expect(200)).body.user.role, 'guest');
    await guestAgent.get('/api/admin/services').expect(200);
    await guestAgent.get('/api/admin/clients').expect(403);
    await guestAgent.patch('/api/admin/website')
      .set('x-csrf-token', guestLogin.body.csrfToken)
      .send({ salonName: 'Blocked guest edit' })
      .expect(403);
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

    const [leave] = await context.db.insert(timeOff).values({ businessId: business.id, artistId: artist.id, startsAt: date.toUTC().toJSDate(), endsAt: date.plus({ days: 2 }).endOf('day').toUTC().toJSDate(), reason: 'Annual leave' }).returning();
    const blocked = await calculateAvailability(context.db, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', addOnSlugs: [], productOn: 'none', from: date.toISODate()!, to: date.plus({ days: 1 }).toISODate()! });
    assert.equal(blocked.slots.length, 0);
    assert.equal(blocked.days[0].status, 'full');
    assert.equal(blocked.days[1].status, 'closed');
    await context.db.delete(timeOff).where(eq(timeOff.id, leave.id));
    const restored = await calculateAvailability(context.db, business.id, { serviceSlug: 'signature-gel', artistSlug: 'maya', addOnSlugs: [], productOn: 'none', from: date.toISODate()!, to: date.toISODate()! });
    assert.ok(restored.slots.length >= 3);
  } finally {
    await context.pool.end();
  }
});

test('public catalog exposes current booking settings', async () => {
  const context = await createTestDatabase();
  try {
    const business = await seedBusiness(context, { slug: 'atelier-union', name: 'Atelier Union' });
    await seedBookingSetup(context, business.id);
    await context.db.update(businessSettings).set({
      depositPence: 2200,
      cancellationCutoffHours: 36,
      maximumAdvanceDays: 90,
    }).where(eq(businessSettings.businessId, business.id));
    const app = createApp(config, context, { sessionStore: new session.MemoryStore(), serveFrontend: false });

    const catalog = await request(app).get('/api/public/catalog').expect(200);
    assert.deepEqual(catalog.body.bookingSettings, {
      depositPence: 2200,
      cancellationCutoffHours: 36,
      maximumAdvanceDays: 90,
    });
  } finally {
    await context.pool.end();
  }
});

test('public appointment submissions are limited without affecting public reads', async () => {
  const context = await createTestDatabase();
  try {
    await seedBusiness(context, { slug: 'atelier-union', name: 'Atelier Union' });
    const app = createApp(config, context, { sessionStore: new session.MemoryStore(), serveFrontend: false });
    const agent = request.agent(app);
    const sessionResponse = await agent.get('/api/auth/session').expect(200);
    const csrfToken = sessionResponse.body.csrfToken as string;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await agent
        .post('/api/public/appointments')
        .set('x-csrf-token', csrfToken)
        .send({})
        .expect(400);
    }
    const limited = await agent
      .post('/api/public/appointments')
      .set('x-csrf-token', csrfToken)
      .send({})
      .expect(429);
    assert.equal(limited.body.error.code, 'BOOKING_RATE_LIMITED');
    assert.equal(limited.body.error.message, 'Too many booking attempts. Please try again in 15 minutes.');
    await agent.get('/api/public/catalog').expect(200);
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

    await updateAppointment(context.pool, business.id, first.id, {
      artistId: artist.id,
      startsAt: firstSlot.startsAt,
      status: 'confirmed',
      paymentStatus: 'deposit_recorded',
    });
    await updateAppointment(context.pool, business.id, first.id, { paymentStatus: 'paid' });
    await updateAppointment(context.pool, business.id, first.id, { paymentStatus: 'paid' });
    await updateAppointment(context.pool, business.id, first.id, { paymentStatus: 'deposit_recorded' });
    await updateAppointment(context.pool, business.id, first.id, { paymentStatus: 'paid' });
    const ledger = await context.db.select().from(payments).where(eq(payments.appointmentId, first.id));
    assert.equal(ledger.length, 2);
    assert.equal(ledger.find((payment) => payment.kind === 'deposit')?.amountPence, 1500);
    assert.equal(ledger.find((payment) => payment.kind === 'balance')?.amountPence, 2700);
    assert.equal(ledger.reduce((sum, payment) => sum + payment.amountPence, 0), 4200);

    await updateAppointment(context.pool, business.id, first.id, { paymentStatus: 'refunded' });
    await updateAppointment(context.pool, business.id, first.id, { paymentStatus: 'refunded' });
    const fullRefundLedger = await context.db.select().from(payments).where(eq(payments.appointmentId, first.id));
    assert.equal(fullRefundLedger.length, 3);
    assert.equal(fullRefundLedger.find((payment) => payment.kind === 'refund')?.amountPence, -4200);
    assert.equal(fullRefundLedger.reduce((sum, payment) => sum + payment.amountPence, 0), 0);

    await updateAppointment(context.pool, business.id, second.id, { paymentStatus: 'deposit_recorded' });
    await updateAppointment(context.pool, business.id, second.id, { paymentStatus: 'refunded' });
    await updateAppointment(context.pool, business.id, second.id, { paymentStatus: 'refunded' });
    const depositRefundLedger = await context.db.select().from(payments).where(eq(payments.appointmentId, second.id));
    assert.equal(depositRefundLedger.length, 2);
    assert.equal(depositRefundLedger.find((payment) => payment.kind === 'deposit')?.amountPence, 1500);
    assert.equal(depositRefundLedger.find((payment) => payment.kind === 'refund')?.amountPence, -1500);
    assert.equal(depositRefundLedger.reduce((sum, payment) => sum + payment.amountPence, 0), 0);

    await updateAppointment(context.pool, business.id, first.id, { status: 'cancelled' });
    const [cancelled] = await context.db.select().from(appointments).where(eq(appointments.id, first.id));
    assert.equal(cancelled.status, 'cancelled');
    assert.ok(cancelled.cancelledAt instanceof Date);
  } finally {
    await context.pool.end();
  }
});

test('lookbook management is tenant-scoped and public visibility follows publishing', async () => {
  const context = await createTestDatabase();
  try {
    const business = await seedBusiness(context, { slug: 'atelier-union', name: 'Atelier Union' });
    const otherBusiness = await seedBusiness(context, { slug: 'other-salon', name: 'Other Salon' });
    const { category, service, artist } = await seedBookingSetup(context, business.id);
    const otherSetup = await seedBookingSetup(context, otherBusiness.id);
    const [addOn] = await context.db.insert(services).values({
      businessId: business.id,
      categoryId: category.id,
      slug: 'editorial-finish',
      name: 'Editorial Finish',
      shortName: 'Editorial Finish',
      pricePence: 800,
      durationMinutes: 15,
      isAddOn: true,
    }).returning();
    const [owner] = await context.db.insert(users).values({
      email: 'owner@example.com',
      normalizedEmail: 'owner@example.com',
      passwordHash: await hash('correct-password-123', 4),
    }).returning();
    await context.db.insert(businessMemberships).values({ businessId: business.id, userId: owner.id, role: 'owner' });
    await context.db.insert(lookbookEntries).values({
      businessId: otherBusiness.id,
      slug: 'private-tenant-look',
      name: 'Private Tenant Look',
      image: '/images/work-oxblood.webp',
      altText: 'A private tenant look.',
      category: 'Colour',
      complexity: 'Low',
      treatmentId: otherSetup.service.id,
    });

    const app = createApp(config, context, { sessionStore: new session.MemoryStore(), serveFrontend: false });
    const agent = request.agent(app);
    const sessionResponse = await agent.get('/api/auth/session').expect(200);
    const login = await agent.post('/api/auth/login')
      .set('x-csrf-token', sessionResponse.body.csrfToken)
      .send({ email: 'owner@example.com', password: 'correct-password-123' })
      .expect(200);
    const csrfToken = login.body.csrfToken as string;
    const created = await agent.post('/api/admin/lookbook').set('x-csrf-token', csrfToken).send({
      name: 'QA Editorial Red',
      image: '/images/work-oxblood.webp',
      altText: 'Deep red nails in an editorial close-up.',
      category: 'Colour',
      complexity: 'Low',
      description: 'A database-backed test look.',
      treatmentId: service.id,
      addOnId: addOn.id,
      artistId: artist.id,
      published: true,
      active: true,
    }).expect(201);
    const adminLooks = await agent.get('/api/admin/lookbook').expect(200);
    assert.deepEqual(adminLooks.body.looks.map((look: { name: string }) => look.name), ['QA Editorial Red']);
    const publicLooks = await request(app).get('/api/public/lookbook').expect(200);
    assert.deepEqual(publicLooks.body.looks.map((look: { id: string }) => look.id), ['qa-editorial-red']);

    await context.db.update(services).set({ active: false }).where(eq(services.id, addOn.id));
    assert.equal((await request(app).get('/api/public/lookbook').expect(200)).body.looks.length, 0);
    await context.db.update(services).set({ active: true }).where(eq(services.id, addOn.id));

    await agent.patch(`/api/admin/lookbook/${created.body.look.id}`).set('x-csrf-token', csrfToken).send({ published: false }).expect(200);
    assert.equal((await request(app).get('/api/public/lookbook').expect(200)).body.looks.length, 0);
    await agent.delete(`/api/admin/lookbook/${created.body.look.id}`).set('x-csrf-token', csrfToken).expect(204);
  } finally {
    await context.pool.end();
  }
});

test('the production migration includes database-level overlap protection', () => {
  const migration = new URL('../migrations/0000_empty_colleen_wing.sql', import.meta.url);
  const text = readFileSync(migration, 'utf8');
  assert.match(text, /appointments_no_artist_overlap/);
  assert.match(text, /EXCLUDE USING gist/);
  const functionalMigration = readFileSync(new URL('../migrations/0001_green_carlie_cooper.sql', import.meta.url), 'utf8');
  assert.match(functionalMigration, /CREATE TABLE "lookbook_entries"/);
  assert.match(functionalMigration, /payments_appointment_kind_uidx/);
});
