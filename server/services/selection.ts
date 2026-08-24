import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../db/database.js';
import { serviceCategories, services } from '../db/schema.js';
import { AppError } from '../errors.js';

export const bookingSelectionSchema = z.object({
  serviceSlug: z.string().min(1).max(140),
  addOnSlugs: z.array(z.string().min(1).max(140)).max(8).default([]),
  productOn: z.enum(['none', 'gel', 'builder', 'extensions']).default('none'),
});

export type BookingSelectionInput = z.infer<typeof bookingSelectionSchema>;

const removalOptions = {
  none: { label: 'Nothing', durationMinutes: 0, pricePence: 0 },
  gel: { label: 'Gel', durationMinutes: 20, pricePence: 1400 },
  builder: { label: 'Builder gel / BIAB', durationMinutes: 30, pricePence: 1800 },
  extensions: { label: 'Extensions', durationMinutes: 30, pricePence: 2000 },
} as const;

export async function resolveBookingSelection(
  db: Database,
  businessId: string,
  input: BookingSelectionInput,
) {
  const baseRows = await db
    .select({ service: services, categorySlug: serviceCategories.slug })
    .from(services)
    .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .where(
      and(
        eq(services.businessId, businessId),
        eq(services.slug, input.serviceSlug),
        eq(services.active, true),
        eq(services.isAddOn, false),
      ),
    )
    .limit(1);

  const base = baseRows[0];
  if (!base) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Treatment not found.');

  const uniqueAddOns = [...new Set(input.addOnSlugs)];
  const addOnRows = uniqueAddOns.length
    ? await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.businessId, businessId),
            eq(services.active, true),
            eq(services.isAddOn, true),
            inArray(services.slug, uniqueAddOns),
          ),
        )
    : [];

  if (addOnRows.length !== uniqueAddOns.length) {
    throw new AppError(400, 'INVALID_ADD_ON', 'One or more add-ons are unavailable.');
  }
  if (
    addOnRows.some(
      (addOn) =>
        !base.service.acceptsAddOns ||
        !addOn.compatibleCategorySlugs.includes(base.categorySlug),
    )
  ) {
    throw new AppError(400, 'INCOMPATIBLE_ADD_ON', 'An add-on is not compatible.');
  }

  const removal = base.service.allowsProductRemoval
    ? removalOptions[input.productOn]
    : removalOptions.none;
  const durationMinutes =
    base.service.durationMinutes +
    addOnRows.reduce((sum, addOn) => sum + addOn.durationMinutes, 0) +
    removal.durationMinutes;
  const totalPence =
    base.service.pricePence +
    addOnRows.reduce((sum, addOn) => sum + addOn.pricePence, 0) +
    removal.pricePence;

  return {
    base: base.service,
    categorySlug: base.categorySlug,
    addOns: addOnRows,
    removal,
    productOn: input.productOn,
    durationMinutes,
    totalPence,
  };
}

export type ResolvedBookingSelection = Awaited<ReturnType<typeof resolveBookingSelection>>;
