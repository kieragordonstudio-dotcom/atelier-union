import { DateTime } from 'luxon';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import type { Database } from '../db/database.js';
import { businesses } from '../db/schema.js';
import { AppError, ConflictError } from '../errors.js';
import { calculateAvailability } from './availability.js';
import {
  bookingSelectionSchema,
  resolveBookingSelection,
  type ResolvedBookingSelection,
} from './selection.js';
import { eq } from 'drizzle-orm';

const customerSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  mobile: z.string().trim().min(6).max(80),
  note: z.string().trim().max(2000).default(''),
});

export const createAppointmentSchema = bookingSelectionSchema.extend({
  artistSlug: z.string().min(1).max(120),
  startsAt: z.string().datetime({ offset: true }),
  customer: customerSchema,
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

export function normalizePhone(value: string | null | undefined) {
  const normalized = value?.replace(/[^0-9+]/g, '') || '';
  return normalized.length >= 6 ? normalized : null;
}

export function rangesOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

async function findOrCreateClient(
  client: PoolClient,
  businessId: string,
  customer: CreateAppointmentInput['customer'],
) {
  const normalizedEmail = normalizeEmail(customer.email);
  const normalizedPhone = normalizePhone(customer.mobile);
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    `${businessId}:client:${normalizedEmail ?? ''}:${normalizedPhone ?? ''}`,
  ]);

  const existing = await client.query<{ id: string }>(
    `SELECT id
       FROM clients
      WHERE business_id = $1
        AND anonymized_at IS NULL
        AND (($2::text IS NOT NULL AND normalized_email = $2)
          OR ($3::text IS NOT NULL AND normalized_phone = $3))
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE`,
    [businessId, normalizedEmail, normalizedPhone],
  );

  if (existing.rows[0]) {
    await client.query(
      `UPDATE clients
          SET name = $2,
              email = $3,
              normalized_email = $4,
              phone = $5,
              normalized_phone = $6,
              updated_at = now()
        WHERE id = $1`,
      [
        existing.rows[0].id,
        customer.fullName,
        customer.email,
        normalizedEmail,
        customer.mobile,
        normalizedPhone,
      ],
    );
    return existing.rows[0].id;
  }

  const created = await client.query<{ id: string }>(
    `INSERT INTO clients
      (business_id, name, email, normalized_email, phone, normalized_phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      businessId,
      customer.fullName,
      customer.email,
      normalizedEmail,
      customer.mobile,
      normalizedPhone,
    ],
  );
  return created.rows[0].id;
}

async function insertAppointmentServices(
  client: PoolClient,
  businessId: string,
  appointmentId: string,
  selection: ResolvedBookingSelection,
) {
  const rows = [
    {
      id: selection.base.id,
      name: selection.base.name,
      slug: selection.base.slug,
      type: 'treatment',
      duration: selection.base.durationMinutes,
      price: selection.base.pricePence,
    },
    ...selection.addOns.map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      slug: addOn.slug,
      type: 'add_on',
      duration: addOn.durationMinutes,
      price: addOn.pricePence,
    })),
  ];
  if (selection.removal.durationMinutes) {
    rows.push({
      id: null as unknown as string,
      name: `${selection.removal.label} removal`,
      slug: `removal-${selection.productOn}`,
      type: 'removal',
      duration: selection.removal.durationMinutes,
      price: selection.removal.pricePence,
    });
  }

  for (const [sortOrder, row] of rows.entries()) {
    await client.query(
      `INSERT INTO appointment_services
        (business_id, appointment_id, service_id, service_name, service_slug,
         service_type, duration_minutes, price_pence, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        businessId,
        appointmentId,
        row.id,
        row.name,
        row.slug,
        row.type,
        row.duration,
        row.price,
        sortOrder,
      ],
    );
  }
}

export async function createAppointment(
  db: Database,
  pool: Pool,
  businessId: string,
  rawInput: CreateAppointmentInput,
  bookingSource: 'public' | 'admin',
) {
  const input = createAppointmentSchema.parse(rawInput);
  const [business] = await db
    .select({ timezone: businesses.timezone })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Salon not found.');

  const selection = await resolveBookingSelection(db, businessId, input);
  const requestedStart = DateTime.fromISO(input.startsAt).toUTC();
  const localDate = requestedStart.setZone(business.timezone).toISODate();
  if (!requestedStart.isValid || !localDate) {
    throw new AppError(400, 'INVALID_START_TIME', 'Choose a valid appointment time.');
  }

  const availability = await calculateAvailability(db, businessId, {
    ...input,
    from: localDate,
    to: localDate,
  });
  const validSlot = availability.slots.find(
    (slot) =>
      slot.artist === input.artistSlug &&
      DateTime.fromISO(slot.startsAt).toMillis() === requestedStart.toMillis(),
  );
  if (!validSlot) throw new ConflictError();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const artistResult = await client.query<{ id: string }>(
      `SELECT id FROM artists
        WHERE business_id = $1 AND slug = $2 AND active = true
        FOR SHARE`,
      [businessId, input.artistSlug],
    );
    const artistId = artistResult.rows[0]?.id;
    if (!artistId) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Nail Artist not found.');

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [artistId]);
    const settingsResult = await client.query<{ buffer_minutes: number; deposit_pence: number }>(
      `SELECT buffer_minutes, deposit_pence
         FROM business_settings
        WHERE business_id = $1
        FOR SHARE`,
      [businessId],
    );
    const settings = settingsResult.rows[0];
    if (!settings) throw new AppError(500, 'SETTINGS_MISSING', 'Booking settings are missing.');

    const startDate = requestedStart.toJSDate();
    const endDate = requestedStart.plus({ minutes: selection.durationMinutes }).toJSDate();
    const bufferedStart = requestedStart.minus({ minutes: settings.buffer_minutes }).toJSDate();
    const bufferedEnd = requestedStart
      .plus({ minutes: selection.durationMinutes + settings.buffer_minutes })
      .toJSDate();
    const conflicts = await client.query(
      `SELECT id FROM appointments
        WHERE business_id = $1
          AND artist_id = $2
          AND status IN ('confirmed', 'completed')
          AND starts_at < $4::timestamptz
          AND ends_at > $3::timestamptz
        LIMIT 1`,
      [businessId, artistId, bufferedStart, bufferedEnd],
    );
    const blocked = await client.query(
      `SELECT id FROM time_off
        WHERE business_id = $1
          AND artist_id = $2
          AND starts_at < $4::timestamptz
          AND ends_at > $3::timestamptz
        LIMIT 1`,
      [businessId, artistId, startDate, endDate],
    );
    if (conflicts.rowCount || blocked.rowCount) throw new ConflictError();

    const clientId = await findOrCreateClient(client, businessId, input.customer);
    const appointmentResult = await client.query<{ id: string }>(
      `INSERT INTO appointments
        (business_id, client_id, artist_id, starts_at, ends_at, duration_minutes,
         total_pence, deposit_pence, payment_status, status, customer_note, booking_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unpaid', 'confirmed', $9, $10)
       RETURNING id`,
      [
        businessId,
        clientId,
        artistId,
        startDate,
        endDate,
        selection.durationMinutes,
        selection.totalPence,
        settings.deposit_pence,
        input.customer.note,
        bookingSource,
      ],
    );
    const appointmentId = appointmentResult.rows[0].id;
    await insertAppointmentServices(client, businessId, appointmentId, selection);
    await client.query('COMMIT');

    return {
      id: appointmentId,
      clientId,
      artistId,
      startsAt: requestedStart.toISO(),
      endsAt: requestedStart.plus({ minutes: selection.durationMinutes }).toISO(),
      durationMinutes: selection.durationMinutes,
      totalPence: selection.totalPence,
      depositPence: settings.deposit_pence,
      status: 'confirmed' as const,
      paymentStatus: 'unpaid' as const,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (
      error instanceof ConflictError ||
      (typeof error === 'object' && error !== null && 'code' in error && error.code === '23P01')
    ) {
      throw new ConflictError();
    }
    throw error;
  } finally {
    client.release();
  }
}
