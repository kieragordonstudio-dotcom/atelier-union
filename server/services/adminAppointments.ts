import { DateTime } from 'luxon';
import type { Pool } from 'pg';
import { z } from 'zod';
import { AppError, ConflictError } from '../errors.js';

export const appointmentUpdateSchema = z
  .object({
    artistId: z.string().uuid().optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']).optional(),
    paymentStatus: z.enum(['unpaid', 'deposit_recorded', 'paid', 'refunded']).optional(),
    internalNotes: z.string().trim().max(4000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one change is required.');

export type AppointmentUpdate = z.infer<typeof appointmentUpdateSchema>;

export async function updateAppointment(
  pool: Pool,
  businessId: string,
  appointmentId: string,
  rawInput: AppointmentUpdate,
) {
  const input = appointmentUpdateSchema.parse(rawInput);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query<{
      id: string;
      artist_id: string;
      starts_at: Date;
      ends_at: Date;
      duration_minutes: number;
      total_pence: number;
      deposit_pence: number;
      payment_status: 'unpaid' | 'deposit_recorded' | 'paid' | 'refunded';
      status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    }>(
      `SELECT id, artist_id, starts_at, ends_at, duration_minutes, total_pence,
              deposit_pence, payment_status, status
         FROM appointments
        WHERE id = $1 AND business_id = $2
        FOR UPDATE`,
      [appointmentId, businessId],
    );
    const current = currentResult.rows[0];
    if (!current) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found.');

    const nextArtistId = input.artistId ?? current.artist_id;
    const nextStart = input.startsAt
      ? DateTime.fromISO(input.startsAt).toUTC()
      : DateTime.fromJSDate(current.starts_at).toUTC();
    if (!nextStart.isValid) throw new AppError(400, 'INVALID_START_TIME', 'Invalid start time.');
    const nextEnd = nextStart.plus({ minutes: current.duration_minutes });
    const nextStatus = input.status ?? current.status;

    for (const artistId of [...new Set([current.artist_id, nextArtistId])].sort()) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [artistId]);
    }

    if (nextStatus === 'confirmed' || nextStatus === 'completed') {
      const artistCheck = await client.query(
        `SELECT 1
           FROM artists a
          WHERE a.id = $1 AND a.business_id = $2 AND a.active = true
            AND EXISTS (
              SELECT 1
                FROM appointment_services aps
                JOIN artist_services ars ON ars.service_id = aps.service_id
               WHERE aps.appointment_id = $3
                 AND aps.service_type = 'treatment'
                 AND ars.artist_id = a.id
            )`,
        [nextArtistId, businessId, appointmentId],
      );
      if (!artistCheck.rowCount) {
        throw new AppError(400, 'ARTIST_INELIGIBLE', 'This Nail Artist does not offer the treatment.');
      }
      const hoursCheck = await client.query(
        `SELECT 1
           FROM working_hours wh
           JOIN businesses b ON b.id = wh.business_id
          WHERE wh.business_id = $1
            AND wh.artist_id = $2
            AND wh.active = true
            AND wh.day_of_week = EXTRACT(ISODOW FROM ($3::timestamptz AT TIME ZONE b.timezone))
            AND (($3::timestamptz AT TIME ZONE b.timezone)::time >= wh.start_time)
            AND (($4::timestamptz AT TIME ZONE b.timezone)::date = ($3::timestamptz AT TIME ZONE b.timezone)::date)
            AND (($4::timestamptz AT TIME ZONE b.timezone)::time <= wh.end_time)`,
        [businessId, nextArtistId, nextStart.toJSDate(), nextEnd.toJSDate()],
      );
      if (!hoursCheck.rowCount) {
        throw new ConflictError('The appointment falls outside this artist’s working hours.');
      }
      const settingsResult = await client.query<{ buffer_minutes: number }>(
        'SELECT buffer_minutes FROM business_settings WHERE business_id = $1 FOR SHARE',
        [businessId],
      );
      const buffer = settingsResult.rows[0]?.buffer_minutes ?? 0;
      const bufferedStart = nextStart.minus({ minutes: buffer }).toJSDate();
      const bufferedEnd = nextEnd.plus({ minutes: buffer }).toJSDate();
      const conflicts = await client.query(
        `SELECT id FROM appointments
          WHERE business_id = $1
            AND artist_id = $2
            AND id <> $3
            AND status IN ('confirmed', 'completed')
            AND starts_at < $5::timestamptz
            AND ends_at > $4::timestamptz
          LIMIT 1`,
        [businessId, nextArtistId, appointmentId, bufferedStart, bufferedEnd],
      );
      const blocked = await client.query(
        `SELECT id FROM time_off
          WHERE business_id = $1 AND artist_id = $2
            AND starts_at < $4::timestamptz AND ends_at > $3::timestamptz
          LIMIT 1`,
        [businessId, nextArtistId, nextStart.toJSDate(), nextEnd.toJSDate()],
      );
      if (conflicts.rowCount || blocked.rowCount) throw new ConflictError();
    }

    const paymentStatus = input.paymentStatus ?? current.payment_status;
    await client.query(
      `UPDATE appointments
          SET artist_id = $3,
              starts_at = $4,
              ends_at = $5,
              status = $6,
              payment_status = $7,
              internal_notes = COALESCE($8, internal_notes),
              cancelled_at = $9,
              updated_at = now()
        WHERE id = $1 AND business_id = $2`,
      [
        appointmentId,
        businessId,
        nextArtistId,
        nextStart.toJSDate(),
        nextEnd.toJSDate(),
        nextStatus,
        paymentStatus,
        input.internalNotes ?? null,
        nextStatus === 'cancelled' ? new Date() : null,
      ],
    );

    if (input.paymentStatus && input.paymentStatus !== current.payment_status) {
      const payment =
        input.paymentStatus === 'deposit_recorded'
          ? { kind: 'deposit', amount: current.deposit_pence }
          : input.paymentStatus === 'paid'
            ? { kind: 'balance', amount: current.total_pence }
            : input.paymentStatus === 'refunded'
              ? { kind: 'refund', amount: -current.total_pence }
              : null;
      if (payment) {
        await client.query(
          `INSERT INTO payments
            (business_id, appointment_id, amount_pence, kind, status, note)
           VALUES ($1, $2, $3, $4, $5, 'Recorded manually in KGD')`,
          [businessId, appointmentId, payment.amount, payment.kind, input.paymentStatus],
        );
      }
    }

    await client.query('COMMIT');
    return { id: appointmentId };
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
