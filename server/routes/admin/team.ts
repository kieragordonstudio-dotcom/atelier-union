import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseContext } from '../../db/database.js';
import { AppError, ConflictError } from '../../errors.js';
import type { AdminRequest } from '../../middleware/auth.js';
import { recordAudit } from '../../services/audit.js';

const artistSchema = z.object({
  name: z.string().trim().min(2).max(180),
  role: z.string().trim().min(2).max(180),
  specialties: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  profile: z.string().trim().max(2000).default(''),
  image: z.string().trim().max(500).default('/images/artist-maya.webp'),
  selectedWork: z.array(z.string().trim().max(120)).max(20).default([]),
  active: z.boolean().default(true),
  serviceIds: z.array(z.string().uuid()).max(100).default([]),
});
const hoursSchema = z.object({
  hours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(1).max(7),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        active: z.boolean().default(true),
      }),
    )
    .max(7)
    .refine(
      (hours) => new Set(hours.map((hour) => hour.dayOfWeek)).size === hours.length,
      'Only one working period per day is supported.',
    )
    .refine((hours) => hours.every((hour) => hour.endTime > hour.startTime), 'End time must be later.'),
});
const timeOffSchema = z.object({
  artistId: z.string().uuid(),
  type: z.enum(['time_off', 'blocked']).default('time_off'),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(2).max(240),
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

async function setArtistServices(
  context: DatabaseContext,
  businessId: string,
  artistId: string,
  serviceIds: string[],
) {
  const client = await context.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM artist_services WHERE business_id = $1 AND artist_id = $2', [
      businessId,
      artistId,
    ]);
    for (const serviceId of serviceIds) {
      const inserted = await client.query(
        `INSERT INTO artist_services (business_id, artist_id, service_id)
         SELECT $1, $2, id FROM services
          WHERE id = $3 AND business_id = $1 AND is_add_on = false
         ON CONFLICT DO NOTHING`,
        [businessId, artistId, serviceId],
      );
      if (!inserted.rowCount) throw new AppError(400, 'SERVICE_NOT_FOUND', 'A selected service was not found.');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function writeTimeOff(
  context: DatabaseContext,
  businessId: string,
  input: z.infer<typeof timeOffSchema>,
  id?: string,
) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (endsAt <= startsAt) throw new AppError(400, 'INVALID_TIME_RANGE', 'End time must be later.');
  const client = await context.pool.connect();
  try {
    await client.query('BEGIN');
    const artist = await client.query(
      'SELECT id FROM artists WHERE id = $1 AND business_id = $2 FOR UPDATE',
      [input.artistId, businessId],
    );
    if (!artist.rowCount) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Nail Artist not found.');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.artistId]);
    const conflicts = await client.query(
      `SELECT id FROM appointments
        WHERE business_id = $1 AND artist_id = $2
          AND status IN ('confirmed','completed')
          AND starts_at < $4 AND ends_at > $3
        LIMIT 1`,
      [businessId, input.artistId, startsAt, endsAt],
    );
    if (conflicts.rowCount) {
      throw new ConflictError('Move or cancel the existing appointment before blocking this time.');
    }
    const result = id
      ? await client.query(
          `UPDATE time_off SET artist_id=$3, type=$4, starts_at=$5, ends_at=$6,
                  reason=$7, updated_at=now()
            WHERE id=$1 AND business_id=$2 RETURNING *`,
          [id, businessId, input.artistId, input.type, startsAt, endsAt, input.reason],
        )
      : await client.query(
          `INSERT INTO time_off (business_id, artist_id, type, starts_at, ends_at, reason)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [businessId, input.artistId, input.type, startsAt, endsAt, input.reason],
        );
    if (!result.rows[0]) throw new AppError(404, 'TIME_OFF_NOT_FOUND', 'Time block not found.');
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function teamRoutes(context: DatabaseContext) {
  const router = Router();

  router.get('/team', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const [artistRows, serviceRows, hoursRows, timeOffRows] = await Promise.all([
        context.pool.query(
          `SELECT a.*,
            COALESCE((SELECT json_agg(service_id) FROM artist_services WHERE artist_id = a.id), '[]') AS service_ids
           FROM artists a WHERE a.business_id=$1 ORDER BY a.sort_order, a.name`,
          [businessId],
        ),
        context.pool.query(
          `SELECT id, name, active FROM services WHERE business_id=$1 AND is_add_on=false ORDER BY sort_order`,
          [businessId],
        ),
        context.pool.query(
          `SELECT * FROM working_hours WHERE business_id=$1 ORDER BY artist_id, day_of_week`,
          [businessId],
        ),
        context.pool.query(
          `SELECT t.*, a.name AS artist_name FROM time_off t JOIN artists a ON a.id=t.artist_id
            WHERE t.business_id=$1 AND t.ends_at >= now() ORDER BY t.starts_at`,
          [businessId],
        ),
      ]);
      response.json({
        artists: artistRows.rows,
        services: serviceRows.rows,
        workingHours: hoursRows.rows,
        timeOff: timeOffRows.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/artists', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = artistSchema.parse(request.body);
      const sortResult = await context.pool.query<{ next: number }>(
        'SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM artists WHERE business_id=$1',
        [auth.businessId],
      );
      const result = await context.pool.query(
        `INSERT INTO artists
          (business_id, slug, name, role, image, specialties, profile, selected_work, active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          auth.businessId,
          slugify(input.name),
          input.name,
          input.role,
          input.image,
          input.specialties,
          input.profile,
          input.selectedWork,
          input.active,
          sortResult.rows[0].next,
        ],
      );
      const artist = result.rows[0];
      await setArtistServices(context, auth.businessId, artist.id, input.serviceIds);
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'artist.created',
        entityType: 'artist',
        entityId: artist.id,
      });
      response.status(201).json({ artist });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/artists/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = artistSchema.partial().parse(request.body);
      const currentResult = await context.pool.query(
        'SELECT * FROM artists WHERE id=$1 AND business_id=$2',
        [request.params.id, auth.businessId],
      );
      const current = currentResult.rows[0];
      if (!current) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Nail Artist not found.');
      const value = {
        name: input.name ?? current.name,
        role: input.role ?? current.role,
        image: input.image ?? current.image,
        specialties: input.specialties ?? current.specialties,
        profile: input.profile ?? current.profile,
        selectedWork: input.selectedWork ?? current.selected_work,
        active: input.active ?? current.active,
      };
      const result = await context.pool.query(
        `UPDATE artists SET name=$3, role=$4, image=$5, specialties=$6, profile=$7,
                selected_work=$8, active=$9, updated_at=now()
          WHERE id=$1 AND business_id=$2 RETURNING *`,
        [
          request.params.id,
          auth.businessId,
          value.name,
          value.role,
          value.image,
          value.specialties,
          value.profile,
          value.selectedWork,
          value.active,
        ],
      );
      if (input.serviceIds) {
        await setArtistServices(context, auth.businessId, request.params.id, input.serviceIds);
      }
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'artist.updated',
        entityType: 'artist',
        entityId: request.params.id,
        metadata: { fields: Object.keys(input) },
      });
      response.json({ artist: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.put('/artists/:id/working-hours', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = hoursSchema.parse(request.body);
      const client = await context.pool.connect();
      try {
        await client.query('BEGIN');
        const artist = await client.query(
          'SELECT id FROM artists WHERE id=$1 AND business_id=$2 FOR UPDATE',
          [request.params.id, auth.businessId],
        );
        if (!artist.rowCount) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Nail Artist not found.');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [request.params.id]);
        await client.query('DELETE FROM working_hours WHERE artist_id=$1 AND business_id=$2', [
          request.params.id,
          auth.businessId,
        ]);
        for (const hour of input.hours) {
          await client.query(
            `INSERT INTO working_hours
              (business_id, artist_id, day_of_week, start_time, end_time, active)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              auth.businessId,
              request.params.id,
              hour.dayOfWeek,
              hour.startTime,
              hour.endTime,
              hour.active,
            ],
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'artist.working_hours_updated',
        entityType: 'artist',
        entityId: request.params.id,
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post('/time-off', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const block = await writeTimeOff(context, auth.businessId, timeOffSchema.parse(request.body));
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'time_off.created',
        entityType: 'time_off',
        entityId: block.id,
      });
      response.status(201).json({ timeOff: block });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/time-off/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const block = await writeTimeOff(
        context,
        auth.businessId,
        timeOffSchema.parse(request.body),
        request.params.id,
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'time_off.updated',
        entityType: 'time_off',
        entityId: block.id,
      });
      response.json({ timeOff: block });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/time-off/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const result = await context.pool.query(
        'DELETE FROM time_off WHERE id=$1 AND business_id=$2 RETURNING id',
        [request.params.id, auth.businessId],
      );
      if (!result.rows[0]) throw new AppError(404, 'TIME_OFF_NOT_FOUND', 'Time block not found.');
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'time_off.deleted',
        entityType: 'time_off',
        entityId: request.params.id,
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
