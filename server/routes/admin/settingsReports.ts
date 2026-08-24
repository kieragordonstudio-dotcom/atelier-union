import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseContext } from '../../db/database.js';
import type { AdminRequest } from '../../middleware/auth.js';
import { recordAudit } from '../../services/audit.js';
import { toCsv } from './csv.js';

const websiteSchema = z.object({
  salonName: z.string().trim().min(2).max(180),
  email: z.string().trim().email().max(320).or(z.literal('')),
  phone: z.string().trim().max(80),
  addressLine1: z.string().trim().max(200),
  city: z.string().trim().max(120),
  postcode: z.string().trim().max(32),
  country: z.string().trim().max(120),
  instagramUrl: z.string().trim().url().or(z.literal('')),
  emailUrl: z.string().trim().max(500),
  openingHours: z.array(
    z.object({ days: z.string().max(80), hours: z.string().max(80) }),
  ),
});
const businessSchema = z.object({
  name: z.string().trim().min(2).max(180),
  email: z.string().trim().email().max(320).or(z.literal('')),
  phone: z.string().trim().max(80),
  addressLine1: z.string().trim().max(200),
  city: z.string().trim().max(120),
  postcode: z.string().trim().max(32),
  country: z.string().trim().max(120),
  timezone: z.string().trim().min(3).max(80),
});
const bookingSettingsSchema = z.object({
  minimumNoticeHours: z.coerce.number().int().min(0).max(720),
  maximumAdvanceDays: z.coerce.number().int().min(1).max(730),
  bufferMinutes: z.coerce.number().int().min(0).max(180),
  cancellationCutoffHours: z.coerce.number().int().min(0).max(720),
  depositPence: z.coerce.number().int().min(0).max(100_000),
  taxSetAsidePercent: z.coerce.number().int().min(0).max(100),
});
const reportRangeSchema = z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(30);

export function settingsReportRoutes(context: DatabaseContext) {
  const router = Router();

  router.get('/website', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const result = await context.pool.query(
        'SELECT * FROM website_settings WHERE business_id=$1',
        [businessId],
      );
      response.json({ website: result.rows[0] ?? null });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/website', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = websiteSchema.parse(request.body);
      const result = await context.pool.query(
        `UPDATE website_settings SET salon_name=$2, email=NULLIF($3,''), phone=NULLIF($4,''),
                address_line_1=$5, city=$6, postcode=$7, country=$8,
                instagram_url=NULLIF($9,''), email_url=NULLIF($10,''), opening_hours=$11,
                updated_at=now()
          WHERE business_id=$1 RETURNING *`,
        [
          auth.businessId,
          input.salonName,
          input.email,
          input.phone,
          input.addressLine1,
          input.city,
          input.postcode,
          input.country,
          input.instagramUrl,
          input.emailUrl,
          JSON.stringify(input.openingHours),
        ],
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'website.updated',
        entityType: 'website_settings',
        entityId: result.rows[0]?.id,
      });
      response.json({ website: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.get('/settings', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const [business, booking, audits] = await Promise.all([
        context.pool.query('SELECT * FROM businesses WHERE id=$1', [auth.businessId]),
        context.pool.query('SELECT * FROM business_settings WHERE business_id=$1', [auth.businessId]),
        context.pool.query(
          `SELECT action, entity_type, metadata, created_at
             FROM audit_logs WHERE business_id=$1 ORDER BY created_at DESC LIMIT 25`,
          [auth.businessId],
        ),
      ]);
      response.json({
        business: business.rows[0],
        booking: booking.rows[0],
        owner: { email: auth.email, role: auth.role },
        auditLogs: audits.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/settings/business', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = businessSchema.parse(request.body);
      const result = await context.pool.query(
        `UPDATE businesses SET name=$2, email=NULLIF($3,''), phone=NULLIF($4,''),
                address_line_1=$5, city=$6, postcode=$7, country=$8, timezone=$9, updated_at=now()
          WHERE id=$1 RETURNING *`,
        [
          auth.businessId,
          input.name,
          input.email,
          input.phone,
          input.addressLine1,
          input.city,
          input.postcode,
          input.country,
          input.timezone,
        ],
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'business.updated',
        entityType: 'business',
        entityId: auth.businessId,
      });
      response.json({ business: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/settings/booking', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = bookingSettingsSchema.parse(request.body);
      const result = await context.pool.query(
        `UPDATE business_settings SET minimum_notice_hours=$2, maximum_advance_days=$3,
                buffer_minutes=$4, cancellation_cutoff_hours=$5, deposit_pence=$6,
                tax_set_aside_percent=$7, updated_at=now()
          WHERE business_id=$1 RETURNING *`,
        [
          auth.businessId,
          input.minimumNoticeHours,
          input.maximumAdvanceDays,
          input.bufferMinutes,
          input.cancellationCutoffHours,
          input.depositPence,
          input.taxSetAsidePercent,
        ],
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'booking_settings.updated',
        entityType: 'business_settings',
        entityId: result.rows[0]?.id,
      });
      response.json({ booking: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.get('/analytics', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const days = reportRangeSchema.parse(request.query.range);
      const [summary, treatments, byArtist, clients] = await Promise.all([
        context.pool.query(
          `SELECT COUNT(*)::int AS bookings,
                  COUNT(*) FILTER (WHERE status='completed')::int AS completed_bookings,
                  COUNT(*) FILTER (WHERE status='cancelled')::int AS cancellations,
                  COUNT(*) FILTER (WHERE status='no_show')::int AS no_shows,
                  COALESCE(SUM(total_pence) FILTER (WHERE status='completed'),0)::int AS revenue,
                  COALESCE(AVG(total_pence) FILTER (WHERE status <> 'cancelled'),0)::int AS average_booking_value
             FROM appointments
            WHERE business_id=$1 AND starts_at >= now() - make_interval(days => $2)`,
          [businessId, days],
        ),
        context.pool.query(
          `SELECT aps.service_name AS name, COUNT(*)::int AS bookings,
                  COALESCE(SUM(aps.price_pence),0)::int AS revenue
             FROM appointment_services aps JOIN appointments a ON a.id=aps.appointment_id
            WHERE aps.business_id=$1 AND aps.service_type='treatment'
              AND a.starts_at >= now() - make_interval(days => $2) AND a.status <> 'cancelled'
            GROUP BY aps.service_name ORDER BY bookings DESC, name LIMIT 10`,
          [businessId, days],
        ),
        context.pool.query(
          `SELECT ar.name, COUNT(a.id)::int AS bookings,
                  COALESCE(SUM(a.duration_minutes) FILTER (WHERE a.status <> 'cancelled'),0)::int AS booked_minutes,
                  COALESCE((
                    SELECT SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/60)::int
                    FROM generate_series(current_date - ($2::int - 1), current_date, interval '1 day') day
                    JOIN working_hours wh ON wh.artist_id=ar.id
                      AND wh.active=true AND wh.day_of_week=EXTRACT(ISODOW FROM day)
                  ),0)::int AS available_minutes
             FROM artists ar LEFT JOIN appointments a ON a.artist_id=ar.id
               AND a.starts_at >= now() - make_interval(days => $2)
            WHERE ar.business_id=$1 GROUP BY ar.id ORDER BY ar.sort_order`,
          [businessId, days],
        ),
        context.pool.query(
          `WITH ranged AS (
             SELECT DISTINCT client_id FROM appointments
              WHERE business_id=$1 AND starts_at >= now() - make_interval(days => $2)
           )
           SELECT
             COUNT(*) FILTER (WHERE NOT EXISTS (
               SELECT 1 FROM appointments old
                WHERE old.business_id=$1 AND old.client_id=r.client_id
                  AND old.starts_at < now() - make_interval(days => $2)
             ))::int AS new_clients,
             COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM appointments old
                WHERE old.business_id=$1 AND old.client_id=r.client_id
                  AND old.starts_at < now() - make_interval(days => $2)
             ))::int AS returning_clients
           FROM ranged r`,
          [businessId, days],
        ),
      ]);
      response.json({
        range: days,
        summary: summary.rows[0],
        clients: clients.rows[0],
        topTreatments: treatments.rows,
        byArtist: byArtist.rows.map((row) => ({
          ...row,
          utilisation:
            Number(row.available_minutes) > 0
              ? Math.round((Number(row.booked_minutes) / Number(row.available_minutes)) * 100)
              : 0,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/finances', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const days = reportRangeSchema.parse(request.query.range);
      const [summary, months, settings] = await Promise.all([
        context.pool.query(
          `SELECT
             COALESCE(SUM(total_pence) FILTER (WHERE status IN ('confirmed','completed')),0)::int AS booked_revenue,
             COALESCE(SUM(total_pence) FILTER (WHERE status='completed'),0)::int AS completed_revenue,
             COALESCE(SUM(deposit_pence) FILTER (WHERE payment_status IN ('deposit_recorded','paid')),0)::int AS deposits,
             COALESCE(SUM(total_pence - CASE WHEN payment_status IN ('deposit_recorded','paid') THEN deposit_pence ELSE 0 END)
               FILTER (WHERE status IN ('confirmed','completed') AND payment_status <> 'paid'),0)::int AS outstanding_balances,
             COALESCE((SELECT SUM(amount_pence) FROM payments WHERE business_id=$1
               AND kind IN ('refund','adjustment') AND recorded_at >= now()-make_interval(days=>$2)),0)::int AS refunds_adjustments
           FROM appointments WHERE business_id=$1 AND starts_at >= now()-make_interval(days=>$2)`,
          [businessId, days],
        ),
        context.pool.query(
          `SELECT to_char(date_trunc('month', starts_at), 'YYYY-MM') AS month,
                  COALESCE(SUM(total_pence) FILTER (WHERE status IN ('confirmed','completed')),0)::int AS booked,
                  COALESCE(SUM(total_pence) FILTER (WHERE status='completed'),0)::int AS completed
             FROM appointments WHERE business_id=$1
            GROUP BY date_trunc('month', starts_at) ORDER BY month DESC LIMIT 12`,
          [businessId],
        ),
        context.pool.query('SELECT tax_set_aside_percent FROM business_settings WHERE business_id=$1', [
          businessId,
        ]),
      ]);
      const taxPercent = settings.rows[0]?.tax_set_aside_percent ?? 0;
      const summaryRow = summary.rows[0];
      response.json({
        range: days,
        summary: {
          ...summaryRow,
          taxSetAsidePercent: taxPercent,
          estimatedTaxSetAside: Math.round(Number(summaryRow.completed_revenue) * taxPercent * 0.01),
        },
        months: months.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/finances/export.csv', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const result = await context.pool.query(
        `SELECT a.starts_at, c.name AS client, ar.name AS artist,
                COALESCE((SELECT string_agg(service_name, ', ' ORDER BY sort_order)
                  FROM appointment_services WHERE appointment_id=a.id),'Appointment') AS services,
                a.status, a.payment_status, a.total_pence, a.deposit_pence
           FROM appointments a JOIN clients c ON c.id=a.client_id JOIN artists ar ON ar.id=a.artist_id
          WHERE a.business_id=$1 ORDER BY a.starts_at DESC`,
        [businessId],
      );
      response.type('text/csv').attachment('atelier-union-finances.csv').send(
        toCsv(
          ['Start', 'Client', 'Artist', 'Services', 'Status', 'Payment status', 'Total pence', 'Deposit pence'],
          result.rows.map((row) => [
            row.starts_at,
            row.client,
            row.artist,
            row.services,
            row.status,
            row.payment_status,
            row.total_pence,
            row.deposit_pence,
          ]),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
