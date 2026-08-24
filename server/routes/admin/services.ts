import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseContext } from '../../db/database.js';
import { AppError } from '../../errors.js';
import type { AdminRequest } from '../../middleware/auth.js';
import { recordAudit } from '../../services/audit.js';

const serviceInputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(''),
  pricePence: z.coerce.number().int().min(0).max(1_000_000),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  isAddOn: z.boolean().default(false),
  featured: z.boolean().default(false),
  acceptsAddOns: z.boolean().default(false),
  allowsProductRemoval: z.boolean().default(false),
  compatibleCategorySlugs: z.array(z.string().max(120)).max(20).default([]),
  finderTags: z.array(z.string().max(80)).max(20).default([]),
  active: z.boolean().default(true),
});
const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).default(''),
});
const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0) })).max(200),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export function serviceRoutes(context: DatabaseContext) {
  const router = Router();

  router.get('/services', async (request, response, next) => {
    try {
      const { businessId } = (request as AdminRequest).adminAuth;
      const [categories, serviceRows] = await Promise.all([
        context.pool.query(
          'SELECT * FROM service_categories WHERE business_id = $1 ORDER BY sort_order, name',
          [businessId],
        ),
        context.pool.query(
          `SELECT s.*, sc.name AS category_name, sc.slug AS category_slug
             FROM services s JOIN service_categories sc ON sc.id = s.category_id
            WHERE s.business_id = $1 ORDER BY s.sort_order, s.name`,
          [businessId],
        ),
      ]);
      response.json({ categories: categories.rows, services: serviceRows.rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/service-categories', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = categoryInputSchema.parse(request.body);
      const sortResult = await context.pool.query<{ next: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM service_categories WHERE business_id = $1',
        [auth.businessId],
      );
      const result = await context.pool.query(
        `INSERT INTO service_categories (business_id, slug, name, description, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [auth.businessId, slugify(input.name), input.name, input.description, sortResult.rows[0].next],
      );
      const category = result.rows[0];
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'service_category.created',
        entityType: 'service_category',
        entityId: category.id,
      });
      response.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  });

  router.post('/services', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = serviceInputSchema.parse(request.body);
      const categoryCheck = await context.pool.query(
        'SELECT id FROM service_categories WHERE id = $1 AND business_id = $2',
        [input.categoryId, auth.businessId],
      );
      if (!categoryCheck.rowCount) throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Category not found.');
      const sortResult = await context.pool.query<{ next: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM services WHERE business_id = $1',
        [auth.businessId],
      );
      const result = await context.pool.query(
        `INSERT INTO services
          (business_id, category_id, slug, name, short_name, description, price_pence,
           duration_minutes, is_add_on, featured, accepts_add_ons, allows_product_removal,
           compatible_category_slugs, finder_tags, active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          auth.businessId,
          input.categoryId,
          slugify(input.name),
          input.name,
          input.shortName,
          input.description,
          input.pricePence,
          input.durationMinutes,
          input.isAddOn,
          input.featured,
          input.acceptsAddOns,
          input.allowsProductRemoval,
          input.compatibleCategorySlugs,
          input.finderTags,
          input.active,
          sortResult.rows[0].next,
        ],
      );
      const service = result.rows[0];
      if (!service.is_add_on) {
        await context.pool.query(
          `INSERT INTO artist_services (business_id, artist_id, service_id)
           SELECT $1, id, $2 FROM artists WHERE business_id = $1 AND active = true
           ON CONFLICT DO NOTHING`,
          [auth.businessId, service.id],
        );
      }
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'service.created',
        entityType: 'service',
        entityId: service.id,
      });
      response.status(201).json({ service });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/services/:id', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = serviceInputSchema.partial().parse(request.body);
      const currentResult = await context.pool.query(
        'SELECT * FROM services WHERE id = $1 AND business_id = $2',
        [request.params.id, auth.businessId],
      );
      const current = currentResult.rows[0];
      if (!current) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found.');
      const value = {
        category_id: input.categoryId ?? current.category_id,
        name: input.name ?? current.name,
        short_name: input.shortName ?? current.short_name,
        description: input.description ?? current.description,
        price_pence: input.pricePence ?? current.price_pence,
        duration_minutes: input.durationMinutes ?? current.duration_minutes,
        is_add_on: input.isAddOn ?? current.is_add_on,
        featured: input.featured ?? current.featured,
        accepts_add_ons: input.acceptsAddOns ?? current.accepts_add_ons,
        allows_product_removal:
          input.allowsProductRemoval ?? current.allows_product_removal,
        compatible_category_slugs:
          input.compatibleCategorySlugs ?? current.compatible_category_slugs,
        finder_tags: input.finderTags ?? current.finder_tags,
        active: input.active ?? current.active,
      };
      const result = await context.pool.query(
        `UPDATE services SET category_id=$3, name=$4, short_name=$5, description=$6,
                price_pence=$7, duration_minutes=$8, is_add_on=$9, featured=$10,
                accepts_add_ons=$11, allows_product_removal=$12,
                compatible_category_slugs=$13, finder_tags=$14, active=$15, updated_at=now()
          WHERE id=$1 AND business_id=$2 RETURNING *`,
        [
          request.params.id,
          auth.businessId,
          value.category_id,
          value.name,
          value.short_name,
          value.description,
          value.price_pence,
          value.duration_minutes,
          value.is_add_on,
          value.featured,
          value.accepts_add_ons,
          value.allows_product_removal,
          value.compatible_category_slugs,
          value.finder_tags,
          value.active,
        ],
      );
      await recordAudit(context.db, request, {
        businessId: auth.businessId,
        userId: auth.userId,
        action: 'service.updated',
        entityType: 'service',
        entityId: request.params.id,
        metadata: { fields: Object.keys(input) },
      });
      response.json({ service: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.post('/services/reorder', async (request, response, next) => {
    try {
      const auth = (request as AdminRequest).adminAuth;
      const input = reorderSchema.parse(request.body);
      const client = await context.pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of input.items) {
          await client.query(
            'UPDATE services SET sort_order = $3, updated_at = now() WHERE id = $1 AND business_id = $2',
            [item.id, auth.businessId, item.sortOrder],
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
        action: 'services.reordered',
        entityType: 'service',
        metadata: { count: input.items.length },
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
