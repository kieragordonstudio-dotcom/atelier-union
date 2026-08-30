import { DateTime } from 'luxon';
import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseContext } from '../../db/database.js';
import type { AdminRequest } from '../../middleware/auth.js';
import { createAppointment, createAppointmentSchema } from '../../services/appointments.js';
import {
  appointmentUpdateSchema,
  updateAppointment,
} from '../../services/adminAppointments.js';
import { recordAudit } from '../../services/audit.js';

const rangeSchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  artistId: z.string().uuid().optional(),
});

export function dashboardCalendarRoutes(context: DatabaseContext) {
  const router = Router();

  router.get('/dashboard', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const { businessId } = auth;
      const businessResult = await context.pool.query<{ timezone: string }>(
        'SELECT timezone FROM businesses WHERE id = $1',
        [businessId],
      );
      const timezone = businessResult.rows[0]?.timezone ?? 'Europe/London';
      const now = DateTime.now().setZone(timezone);
      const todayStart = now.startOf('day').toUTC().toJSDate();
      const todayEnd = now.endOf('day').toUTC().toJSDate();
      const weekStart = now.startOf('week').toUTC().toJSDate();
      const weekEnd = now.endOf('week').toUTC().toJSDate();
      const thirtyDaysAgo = now.minus({ days: 30 }).toUTC().toJSDate();

      const [metrics, today, upcoming] = await Promise.all([
        context.pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE starts_at >= $2 AND starts_at <= $3 AND status <> 'cancelled')::int AS bookings_this_week,
             COALESCE(SUM(total_pence) FILTER (WHERE starts_at >= $2 AND starts_at <= $3 AND status = 'completed'), 0)::int AS revenue_this_week,
             COALESCE(SUM(deposit_pence) FILTER (WHERE starts_at >= $2 AND starts_at <= $3 AND payment_status IN ('deposit_recorded','paid')), 0)::int AS deposits,
             COALESCE(SUM(total_pence - CASE WHEN payment_status IN ('deposit_recorded','paid') THEN deposit_pence ELSE 0 END)
               FILTER (WHERE starts_at >= $2 AND starts_at <= $3 AND status IN ('confirmed','completed') AND payment_status <> 'paid'), 0)::int AS outstanding_balances,
             (SELECT COUNT(*)::int FROM clients WHERE business_id = $1 AND created_at >= $4 AND anonymized_at IS NULL) AS new_clients_30_days
           FROM appointments
          WHERE business_id = $1`,
          [businessId, weekStart, weekEnd, thirtyDaysAgo],
        ),
        context.pool.query(
          `SELECT a.id, a.starts_at, a.ends_at, a.status, a.payment_status,
                  a.total_pence, a.deposit_pence, a.customer_note, a.internal_notes, a.booking_source,
                  c.id AS client_id, c.name AS client_name, c.email, c.phone,
                  ar.id AS artist_id, ar.name AS artist_name,
                  COALESCE((SELECT string_agg(service_name, ', ' ORDER BY sort_order)
                    FROM appointment_services WHERE appointment_id = a.id), 'Appointment') AS services
             FROM appointments a
             JOIN clients c ON c.id = a.client_id
             JOIN artists ar ON ar.id = a.artist_id
            WHERE a.business_id = $1 AND a.starts_at >= $2 AND a.starts_at <= $3
            ORDER BY a.starts_at`,
          [businessId, todayStart, todayEnd],
        ),
        context.pool.query(
          `SELECT a.id, a.starts_at, a.ends_at, a.status, a.payment_status, a.booking_source,
                  a.total_pence, c.name AS client_name, ar.name AS artist_name,
                  COALESCE((SELECT service_name FROM appointment_services
                    WHERE appointment_id = a.id ORDER BY sort_order LIMIT 1), 'Appointment') AS service_name
             FROM appointments a
             JOIN clients c ON c.id = a.client_id
             JOIN artists ar ON ar.id = a.artist_id
            WHERE a.business_id = $1 AND a.starts_at >= now() AND a.status = 'confirmed'
            ORDER BY a.starts_at
            LIMIT 12`,
          [businessId],
        ),
      ]);

      const protectAppointment = (appointment: Record<string, unknown>) =>
        auth.role === 'guest' && appointment.booking_source !== 'demo-seed'
          ? {
              ...appointment,
              client_name: 'Private booking',
              email: null,
              phone: null,
              customer_note: '',
              internal_notes: '',
            }
          : appointment;
      const todayRows = today.rows.map(protectAppointment);
      const upcomingRows = upcoming.rows.map(protectAppointment);
      response.json({
        metrics: {
          ...metrics.rows[0],
          todayAppointments: todayRows.filter((item) => item.status !== 'cancelled').length,
          nextAppointment: upcomingRows[0] ?? null,
        },
        today: todayRows,
        upcoming: upcomingRows,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/calendar', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const { businessId } = auth;
      const input = rangeSchema.parse(request.query);
      const artistFilter = input.artistId ? 'AND ar.id = $4' : '';
      const parameters = input.artistId
        ? [businessId, new Date(input.from), new Date(input.to), input.artistId]
        : [businessId, new Date(input.from), new Date(input.to)];
      const [appointments, blocks, hours, artistRows] = await Promise.all([
        context.pool.query(
          `SELECT a.id, a.starts_at, a.ends_at, a.duration_minutes, a.total_pence,
                  a.deposit_pence, a.status, a.payment_status, a.customer_note,
                  a.internal_notes, a.booking_source, c.id AS client_id,
                  c.name AS client_name, c.email, c.phone,
                  ar.id AS artist_id, ar.name AS artist_name,
                  COALESCE((SELECT json_agg(json_build_object(
                    'name', service_name, 'slug', service_slug, 'type', service_type,
                    'durationMinutes', duration_minutes, 'pricePence', price_pence
                  ) ORDER BY sort_order) FROM appointment_services WHERE appointment_id = a.id), '[]') AS services
             FROM appointments a
             JOIN clients c ON c.id = a.client_id
             JOIN artists ar ON ar.id = a.artist_id
            WHERE a.business_id = $1 AND a.starts_at < $3 AND a.ends_at > $2 ${artistFilter}
            ORDER BY a.starts_at`,
          parameters,
        ),
        context.pool.query(
          `SELECT t.id, t.artist_id, t.type, t.starts_at, t.ends_at, t.reason, ar.name AS artist_name
             FROM time_off t JOIN artists ar ON ar.id = t.artist_id
            WHERE t.business_id = $1 AND t.starts_at < $3 AND t.ends_at > $2
              ${input.artistId ? 'AND t.artist_id = $4' : ''}
            ORDER BY t.starts_at`,
          parameters,
        ),
        context.pool.query(
          `SELECT wh.id, wh.artist_id, wh.day_of_week, wh.start_time, wh.end_time,
                  wh.active, ar.name AS artist_name
             FROM working_hours wh JOIN artists ar ON ar.id = wh.artist_id
            WHERE wh.business_id = $1 ${input.artistId ? 'AND wh.artist_id = $2' : ''}
            ORDER BY ar.sort_order, wh.day_of_week`,
          input.artistId ? [businessId, input.artistId] : [businessId],
        ),
        context.pool.query(
          `SELECT id, slug, name, active FROM artists WHERE business_id = $1 ORDER BY sort_order, name`,
          [businessId],
        ),
      ]);
      response.json({
        appointments: appointments.rows.map((appointment) =>
          auth.role === 'guest' && appointment.booking_source !== 'demo-seed'
            ? {
                ...appointment,
                client_name: 'Private booking',
                email: null,
                phone: null,
                customer_note: '',
                internal_notes: '',
              }
            : appointment,
        ),
        timeOff: auth.role === 'guest'
          ? blocks.rows.map((block) => ({ ...block, reason: 'Unavailable' }))
          : blocks.rows,
        workingHours: hours.rows,
        artists: artistRows.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/appointments', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = createAppointmentSchema.parse(request.body);
      const appointment = await createAppointment(
        context.db,
        context.pool,
        auth.businessId,
        input,
        'admin',
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'appointment.created',
        entityType: 'appointment',
        entityId: appointment.id,
        metadata: { source: 'admin' },
      });
      response.status(201).json({ appointment });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/appointments/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = appointmentUpdateSchema.parse(request.body);
      const appointment = await updateAppointment(
        context.pool,
        auth.businessId,
        request.params.id,
        input,
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'appointment.updated',
        entityType: 'appointment',
        entityId: appointment.id,
        metadata: input,
      });
      response.json({ appointment });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
