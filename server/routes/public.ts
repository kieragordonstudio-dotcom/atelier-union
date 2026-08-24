import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { DateTime } from 'luxon';
import type { DatabaseContext } from '../db/database.js';
import { businesses } from '../db/schema.js';
import { AppError } from '../errors.js';
import { createAppointment, createAppointmentSchema } from '../services/appointments.js';
import { calculateAvailability, availabilityQuerySchema } from '../services/availability.js';
import { getPublicCatalog } from '../services/catalog.js';

async function atelierUnionBusinessId(db: DatabaseContext['db']) {
  const rows = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.slug, 'atelier-union'))
    .limit(1);
  if (!rows[0]) throw new AppError(503, 'NOT_CONFIGURED', 'Salon booking is being configured.');
  return rows[0].id;
}

export function publicRoutes(context: DatabaseContext) {
  const router = Router();

  router.get('/lookbook', async (_request, response, next) => {
    try {
      const businessId = await atelierUnionBusinessId(context.db);
      const result = await context.pool.query(
        `SELECT l.slug, l.name, l.image, l.alt_text, l.category, l.complexity,
                l.description, treatment.slug AS treatment_slug,
                addon.slug AS add_on_slug, addon.name AS add_on_name,
                addon.price_pence AS add_on_price_pence,
                addon.duration_minutes AS add_on_duration_minutes,
                artist.name AS artist_name
           FROM lookbook_entries l
           JOIN services treatment ON treatment.id=l.treatment_id AND treatment.active=true
           LEFT JOIN services addon ON addon.id=l.add_on_id AND addon.active=true
           LEFT JOIN artists artist ON artist.id=l.artist_id
          WHERE l.business_id=$1 AND l.published=true AND l.active=true
          ORDER BY l.sort_order, l.name`,
        [businessId],
      );
      response.json({
        looks: result.rows.map((look) => {
          const addOnPrice = Number(look.add_on_price_pence ?? 0) / 100;
          const addOnDuration = Number(look.add_on_duration_minutes ?? 0);
          const prefix = ['micro-french', 'chrome'].includes(look.add_on_slug) ? '+' : 'from +';
          const priceText = look.add_on_slug
            ? `${prefix}£${addOnPrice} · adds ${addOnDuration} min`
            : 'Included with treatment';
          return {
            id: look.slug,
            name: look.name,
            image: look.image,
            category: look.category,
            complexity: look.complexity,
            description: look.description,
            addOnPrice: priceText,
            additionalTime: look.add_on_slug
              ? `Adds ${addOnDuration} min to your appointment`
              : 'Included with treatment',
            suggestedBaseTreatment: look.treatment_slug,
            addOn: look.add_on_slug ?? undefined,
            artist: look.artist_name ?? 'Any Nail Artist',
            alt: look.alt_text,
          };
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/catalog', async (_request, response, next) => {
    try {
      const businessId = await atelierUnionBusinessId(context.db);
      const catalog = await getPublicCatalog(context.db, businessId);
      const today = DateTime.now().setZone('Europe/London').startOf('day');
      const to = today.plus({ days: 60 });
      const artistAvailability = await Promise.all(
        catalog.artists.map(async (artist) => {
          try {
            const result = await calculateAvailability(context.db, businessId, {
              serviceSlug: 'signature-gel',
              artistSlug: artist.id,
              addOnSlugs: [],
              productOn: 'none',
              from: today.toISODate()!,
              to: to.toISODate()!,
            });
            const first = result.slots[0];
            if (!first) return 'No availability in the next 60 days';
            const date = DateTime.fromISO(first.startsAt).setZone(result.timezone);
            return `${date.hasSame(today, 'day') ? 'Today' : date.toFormat('cccc')}, ${date.toFormat('HH:mm')}`;
          } catch {
            return 'Check booking availability';
          }
        }),
      );
      response.json({
        ...catalog,
        artists: catalog.artists.map((artist, index) => ({
          ...artist,
          nextAvailable: artistAvailability[index],
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/availability', async (request, response, next) => {
    try {
      const input = availabilityQuerySchema.parse({
        serviceSlug: request.query.service,
        artistSlug: request.query.artist ?? 'any',
        addOnSlugs:
          typeof request.query.addOns === 'string' && request.query.addOns
            ? request.query.addOns.split(',')
            : [],
        productOn: request.query.productOn ?? 'none',
        from: request.query.from,
        to: request.query.to,
      });
      const businessId = await atelierUnionBusinessId(context.db);
      response.json(await calculateAvailability(context.db, businessId, input));
    } catch (error) {
      next(error);
    }
  });

  router.post('/appointments', async (request, response, next) => {
    try {
      const businessId = await atelierUnionBusinessId(context.db);
      const input = createAppointmentSchema.parse(request.body);
      const appointment = await createAppointment(
        context.db,
        context.pool,
        businessId,
        input,
        'public',
      );
      response.status(201).json({ appointment });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
