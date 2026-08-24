import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseContext } from '../../db/database.js';
import { AppError } from '../../errors.js';
import type { AdminRequest } from '../../middleware/auth.js';
import { recordAudit } from '../../services/audit.js';

const categories = ['Minimal', 'French', 'Chrome', 'Colour', 'Art', 'Occasion'] as const;
const complexities = ['Low', 'Medium', 'High'] as const;
const lookSchema = z.object({
  name: z.string().trim().min(2).max(200),
  image: z.string().trim().min(1).max(1000),
  altText: z.string().trim().min(2).max(1000),
  category: z.enum(categories),
  complexity: z.enum(complexities),
  description: z.string().trim().max(3000).default(''),
  treatmentId: z.string().uuid(),
  addOnId: z.string().uuid().nullable().default(null),
  artistId: z.string().uuid().nullable().default(null),
  published: z.boolean().default(true),
  active: z.boolean().default(true),
});
const updateLookSchema = lookSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one change is required.',
);
const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0) })).min(1).max(500),
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140);
}

async function validateSelectors(
  context: DatabaseContext,
  businessId: string,
  input: { treatmentId: string; addOnId: string | null; artistId: string | null },
) {
  const [treatment, addOn, artist] = await Promise.all([
    context.pool.query(
      'SELECT id FROM services WHERE id=$1 AND business_id=$2 AND is_add_on=false',
      [input.treatmentId, businessId],
    ),
    input.addOnId
      ? context.pool.query(
          'SELECT id FROM services WHERE id=$1 AND business_id=$2 AND is_add_on=true',
          [input.addOnId, businessId],
        )
      : Promise.resolve({ rowCount: 1 }),
    input.artistId
      ? context.pool.query('SELECT id FROM artists WHERE id=$1 AND business_id=$2', [input.artistId, businessId])
      : Promise.resolve({ rowCount: 1 }),
  ]);
  if (!treatment.rowCount) throw new AppError(400, 'TREATMENT_NOT_FOUND', 'Choose a valid treatment.');
  if (!addOn.rowCount) throw new AppError(400, 'ADD_ON_NOT_FOUND', 'Choose a valid add-on.');
  if (!artist.rowCount) throw new AppError(400, 'ARTIST_NOT_FOUND', 'Choose a valid Nail Artist.');
}

export function lookbookRoutes(context: DatabaseContext) {
  const router = Router();

  router.get('/lookbook', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const [looks, treatments, addOns, artists] = await Promise.all([
        context.pool.query(
          `SELECT l.*, treatment.name AS treatment_name, treatment.slug AS treatment_slug,
                  addon.name AS add_on_name, addon.slug AS add_on_slug,
                  artist.name AS artist_name
             FROM lookbook_entries l
             JOIN services treatment ON treatment.id=l.treatment_id
             LEFT JOIN services addon ON addon.id=l.add_on_id
             LEFT JOIN artists artist ON artist.id=l.artist_id
            WHERE l.business_id=$1 ORDER BY l.sort_order, l.name`,
          [businessId],
        ),
        context.pool.query(
          `SELECT id, name, active FROM services
            WHERE business_id=$1 AND is_add_on=false ORDER BY sort_order, name`,
          [businessId],
        ),
        context.pool.query(
          `SELECT id, name, active FROM services
            WHERE business_id=$1 AND is_add_on=true ORDER BY sort_order, name`,
          [businessId],
        ),
        context.pool.query(
          'SELECT id, name, active FROM artists WHERE business_id=$1 ORDER BY sort_order, name',
          [businessId],
        ),
      ]);
      response.json({
        looks: looks.rows,
        treatments: treatments.rows,
        addOns: addOns.rows,
        artists: artists.rows,
        categories,
        complexities,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/lookbook', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = lookSchema.parse(request.body);
      await validateSelectors(context, auth.businessId, input);
      const sort = await context.pool.query<{ next: number }>(
        'SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM lookbook_entries WHERE business_id=$1',
        [auth.businessId],
      );
      const result = await context.pool.query(
        `INSERT INTO lookbook_entries
          (business_id, slug, name, image, alt_text, category, complexity, description,
           treatment_id, add_on_id, artist_id, published, active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          auth.businessId,
          slugify(input.name),
          input.name,
          input.image,
          input.altText,
          input.category,
          input.complexity,
          input.description,
          input.treatmentId,
          input.addOnId,
          input.artistId,
          input.published,
          input.active,
          sort.rows[0].next,
        ],
      );
      const look = result.rows[0];
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'lookbook.created',
        entityType: 'lookbook_entry',
        entityId: look.id,
      });
      response.status(201).json({ look });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        next(new AppError(409, 'LOOK_EXISTS', 'A look with this name already exists.'));
        return;
      }
      next(error);
    }
  });

  router.patch('/lookbook/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = updateLookSchema.parse(request.body);
      const currentResult = await context.pool.query(
        'SELECT * FROM lookbook_entries WHERE id=$1 AND business_id=$2',
        [request.params.id, auth.businessId],
      );
      const current = currentResult.rows[0];
      if (!current) throw new AppError(404, 'LOOK_NOT_FOUND', 'Look not found.');
      const value = {
        name: input.name ?? current.name,
        image: input.image ?? current.image,
        altText: input.altText ?? current.alt_text,
        category: input.category ?? current.category,
        complexity: input.complexity ?? current.complexity,
        description: input.description ?? current.description,
        treatmentId: input.treatmentId ?? current.treatment_id,
        addOnId: input.addOnId === undefined ? current.add_on_id : input.addOnId,
        artistId: input.artistId === undefined ? current.artist_id : input.artistId,
        published: input.published ?? current.published,
        active: input.active ?? current.active,
      };
      await validateSelectors(context, auth.businessId, value);
      const result = await context.pool.query(
        `UPDATE lookbook_entries SET name=$3, image=$4, alt_text=$5, category=$6,
                complexity=$7, description=$8, treatment_id=$9, add_on_id=$10,
                artist_id=$11, published=$12, active=$13, updated_at=now()
          WHERE id=$1 AND business_id=$2 RETURNING *`,
        [
          request.params.id,
          auth.businessId,
          value.name,
          value.image,
          value.altText,
          value.category,
          value.complexity,
          value.description,
          value.treatmentId,
          value.addOnId,
          value.artistId,
          value.published,
          value.active,
        ],
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'lookbook.updated',
        entityType: 'lookbook_entry',
        entityId: request.params.id,
        metadata: { fields: Object.keys(input) },
      });
      response.json({ look: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.post('/lookbook/reorder', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = reorderSchema.parse(request.body);
      const client = await context.pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of input.items) {
          const result = await client.query(
            'UPDATE lookbook_entries SET sort_order=$3, updated_at=now() WHERE id=$1 AND business_id=$2',
            [item.id, auth.businessId, item.sortOrder],
          );
          if (!result.rowCount) throw new AppError(404, 'LOOK_NOT_FOUND', 'Look not found.');
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
        action: 'lookbook.reordered',
        entityType: 'lookbook_entry',
        metadata: { count: input.items.length },
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.delete('/lookbook/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const result = await context.pool.query(
        'DELETE FROM lookbook_entries WHERE id=$1 AND business_id=$2 RETURNING id',
        [request.params.id, auth.businessId],
      );
      if (!result.rows[0]) throw new AppError(404, 'LOOK_NOT_FOUND', 'Look not found.');
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'lookbook.deleted',
        entityType: 'lookbook_entry',
        entityId: request.params.id,
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
