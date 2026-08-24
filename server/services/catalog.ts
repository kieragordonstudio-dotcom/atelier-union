import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../db/database.js';
import {
  artists,
  serviceCategories,
  services,
  websiteSettings,
} from '../db/schema.js';

export async function getPublicCatalog(db: Database, businessId: string) {
  const [categories, serviceRows, artistRows, websiteRows] = await Promise.all([
    db
      .select()
      .from(serviceCategories)
      .where(
        and(
          eq(serviceCategories.businessId, businessId),
          eq(serviceCategories.active, true),
        ),
      )
      .orderBy(asc(serviceCategories.sortOrder)),
    db
      .select({ service: services, categorySlug: serviceCategories.slug })
      .from(services)
      .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(and(eq(services.businessId, businessId), eq(services.active, true)))
      .orderBy(asc(services.sortOrder)),
    db
      .select()
      .from(artists)
      .where(and(eq(artists.businessId, businessId), eq(artists.active, true)))
      .orderBy(asc(artists.sortOrder)),
    db
      .select()
      .from(websiteSettings)
      .where(eq(websiteSettings.businessId, businessId))
      .limit(1),
  ]);

  return {
    treatmentCategories: categories.map((category) => ({
      id: category.slug,
      label: category.name,
      description: category.description,
    })),
    treatments: serviceRows
      .filter((row) => !row.service.isAddOn)
      .map(({ service, categorySlug }) => ({
        id: service.slug,
        category: categorySlug,
        name: service.name,
        shortName: service.shortName,
        description: service.description,
        duration: service.durationMinutes,
        price: service.pricePence / 100,
        featured: service.featured,
        acceptsAddOns: service.acceptsAddOns,
        allowsProductRemoval: service.allowsProductRemoval,
        finderTags: service.finderTags,
      })),
    addOns: serviceRows
      .filter((row) => row.service.isAddOn)
      .map(({ service }) => ({
        id: service.slug,
        name: service.name,
        description: service.description,
        duration: service.durationMinutes,
        price: service.pricePence / 100,
        priceLabel: `from +£${service.pricePence / 100}`,
        compatibleCategories: service.compatibleCategorySlugs,
      })),
    artists: artistRows.map((artist) => ({
      id: artist.slug,
      name: artist.name,
      role: artist.role,
      image: artist.image,
      specialties: artist.specialties,
      profile: artist.profile,
      selectedWork: artist.selectedWork,
    })),
    website: websiteRows[0] ?? null,
  };
}
