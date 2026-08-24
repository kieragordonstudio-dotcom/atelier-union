import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseContext } from '../../db/database.js';
import { AppError } from '../../errors.js';
import type { AdminRequest } from '../../middleware/auth.js';
import { recordAudit } from '../../services/audit.js';
import { normalizeEmail, normalizePhone } from '../../services/appointments.js';
import { toCsv } from './csv.js';

const clientInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320).or(z.literal('')).default(''),
  phone: z.string().trim().max(80).default(''),
  notes: z.string().trim().max(4000).default(''),
});

export function clientRoutes(context: DatabaseContext) {
  const router = Router();

  router.get('/clients', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const query = z.string().trim().max(120).default('').parse(request.query.q);
      const result = await context.pool.query(
        `SELECT c.id, c.name, c.email, c.phone, c.notes, c.created_at,
                MAX(a.starts_at) FILTER (WHERE a.starts_at < now() AND a.status <> 'cancelled') AS last_appointment,
                MIN(a.starts_at) FILTER (WHERE a.starts_at >= now() AND a.status = 'confirmed') AS next_appointment,
                COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS visits,
                COALESCE(SUM(a.total_pence) FILTER (WHERE a.status = 'completed'), 0)::int AS lifetime_spend
           FROM clients c
           LEFT JOIN appointments a ON a.client_id = c.id AND a.business_id = c.business_id
          WHERE c.business_id = $1 AND c.anonymized_at IS NULL
            AND ($2 = '' OR c.name ILIKE '%' || $2 || '%' OR c.email ILIKE '%' || $2 || '%' OR c.phone ILIKE '%' || $2 || '%')
          GROUP BY c.id
          ORDER BY c.name
          LIMIT 250`,
        [businessId, query],
      );
      response.json({ clients: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/clients/export.csv', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const result = await context.pool.query(
        `SELECT c.name, c.email, c.phone, c.notes, c.created_at,
                COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS visits,
                COALESCE(SUM(a.total_pence) FILTER (WHERE a.status = 'completed'), 0)::int AS lifetime_spend_pence
           FROM clients c
           LEFT JOIN appointments a ON a.client_id = c.id AND a.business_id = c.business_id
          WHERE c.business_id = $1 AND c.anonymized_at IS NULL
          GROUP BY c.id ORDER BY c.name`,
        [businessId],
      );
      response.type('text/csv').attachment('atelier-union-clients.csv').send(
        toCsv(
          ['Name', 'Email', 'Phone', 'Notes', 'Created', 'Completed visits', 'Lifetime spend pence'],
          result.rows.map((row) => [
            row.name,
            row.email,
            row.phone,
            row.notes,
            row.created_at,
            row.visits,
            row.lifetime_spend_pence,
          ]),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get('/clients/:id', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const clientResult = await context.pool.query(
        `SELECT c.*,
                COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS visits,
                COUNT(a.id) FILTER (WHERE a.status = 'cancelled')::int AS cancellations,
                COUNT(a.id) FILTER (WHERE a.status = 'no_show')::int AS no_shows,
                COALESCE(SUM(a.total_pence) FILTER (WHERE a.status = 'completed'), 0)::int AS total_spend
           FROM clients c LEFT JOIN appointments a ON a.client_id = c.id
          WHERE c.id = $1 AND c.business_id = $2 AND c.anonymized_at IS NULL
          GROUP BY c.id`,
        [request.params.id, businessId],
      );
      const client = clientResult.rows[0];
      if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found.');
      const history = await context.pool.query(
        `SELECT a.id, a.starts_at, a.ends_at, a.status, a.payment_status, a.total_pence,
                ar.name AS artist_name,
                COALESCE((SELECT string_agg(service_name, ', ' ORDER BY sort_order)
                  FROM appointment_services WHERE appointment_id = a.id), 'Appointment') AS services
           FROM appointments a JOIN artists ar ON ar.id = a.artist_id
          WHERE a.business_id = $1 AND a.client_id = $2
          ORDER BY a.starts_at DESC`,
        [businessId, client.id],
      );
      response.json({ client, appointments: history.rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/clients', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = clientInputSchema.parse(request.body);
      const result = await context.pool.query(
        `INSERT INTO clients
          (business_id, name, email, normalized_email, phone, normalized_phone, notes)
         VALUES ($1, $2, NULLIF($3, ''), $4, NULLIF($5, ''), $6, $7)
         RETURNING *`,
        [
          auth.businessId,
          input.name,
          input.email,
          normalizeEmail(input.email),
          input.phone,
          normalizePhone(input.phone),
          input.notes,
        ],
      );
      const client = result.rows[0];
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'client.created',
        entityType: 'client',
        entityId: client.id,
      });
      response.status(201).json({ client });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        next(new AppError(409, 'CLIENT_EXISTS', 'A client with that email or phone already exists.'));
        return;
      }
      next(error);
    }
  });

  router.patch('/clients/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = clientInputSchema.partial().parse(request.body);
      const current = await context.pool.query(
        'SELECT * FROM clients WHERE id = $1 AND business_id = $2 AND anonymized_at IS NULL',
        [request.params.id, auth.businessId],
      );
      if (!current.rows[0]) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found.');
      const nextClient = { ...current.rows[0], ...input };
      const result = await context.pool.query(
        `UPDATE clients SET name = $3, email = NULLIF($4, ''), normalized_email = $5,
                phone = NULLIF($6, ''), normalized_phone = $7, notes = $8, updated_at = now()
          WHERE id = $1 AND business_id = $2 RETURNING *`,
        [
          request.params.id,
          auth.businessId,
          nextClient.name,
          nextClient.email,
          normalizeEmail(nextClient.email),
          nextClient.phone,
          normalizePhone(nextClient.phone),
          nextClient.notes,
        ],
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'client.updated',
        entityType: 'client',
        entityId: request.params.id,
      });
      response.json({ client: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.post('/clients/:id/anonymize', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const result = await context.pool.query(
        `UPDATE clients
            SET name = 'Deleted client', email = NULL, normalized_email = NULL,
                phone = NULL, normalized_phone = NULL, notes = '', anonymized_at = now(), updated_at = now()
          WHERE id = $1 AND business_id = $2 AND anonymized_at IS NULL
          RETURNING id`,
        [request.params.id, auth.businessId],
      );
      if (!result.rows[0]) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found.');
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'client.anonymized',
        entityType: 'client',
        entityId: request.params.id,
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
