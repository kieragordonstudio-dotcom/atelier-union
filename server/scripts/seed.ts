import { hash } from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { siteConfig } from '../../src/config/site.js';
import { artists as artistSeed } from '../../src/data/artists.js';
import { lookbook as lookbookSeed } from '../../src/data/lookbook.js';
import {
  addOns,
  treatmentCategories,
  treatments,
} from '../../src/data/treatments.js';
import { loadConfig } from '../config.js';
import { createDatabase } from '../db/database.js';
import {
  artistServices,
  artists,
  businesses,
  businessMemberships,
  businessSettings,
  lookbookEntries,
  serviceCategories,
  services,
  users,
  websiteSettings,
  workingHours,
} from '../db/schema.js';

const config = loadConfig();
const { db, pool } = createDatabase(config);

const dayNumber: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

function splitHours(value: string) {
  const [start, end] = value.split(' - ').map((part) => part.trim());
  return { start, end };
}

try {
  await db.transaction(async (tx) => {
    const [existingBusiness] = await tx
      .select()
      .from(businesses)
      .where(eq(businesses.slug, 'atelier-union'))
      .limit(1);
    const isNewBusiness = !existingBusiness;
    const business = existingBusiness ?? (await tx.insert(businesses).values({
        slug: 'atelier-union',
        name: siteConfig.shortName,
        timezone: 'Europe/London',
        email: siteConfig.email,
        addressLine1: siteConfig.address.line1,
        city: siteConfig.address.city,
        postcode: siteConfig.address.postcode,
        country: siteConfig.address.country,
      })
      .returning())[0];

    const normalizedEmail = config.KGD_ADMIN_EMAIL.trim().toLowerCase();
    const existingUsers = await tx
      .select()
      .from(users)
      .where(eq(users.normalizedEmail, normalizedEmail))
      .limit(1);
    let owner = existingUsers[0];

    if (!owner) {
      const [createdOwner] = await tx
        .insert(users)
        .values({
          email: config.KGD_ADMIN_EMAIL.trim(),
          normalizedEmail,
          passwordHash: await hash(config.KGD_ADMIN_PASSWORD, 12),
        })
        .returning();
      owner = createdOwner;
    }

    await tx
      .insert(businessMemberships)
      .values({ businessId: business.id, userId: owner.id, role: 'owner' })
      .onConflictDoNothing({
        target: [businessMemberships.businessId, businessMemberships.userId],
      });

    if (isNewBusiness) {
    const categoryRows = new Map<string, string>();
    for (const [sortOrder, category] of treatmentCategories.entries()) {
      const [row] = await tx
        .insert(serviceCategories)
        .values({
          businessId: business.id,
          slug: category.id,
          name: category.label,
          description: category.description,
          sortOrder,
        })
        .onConflictDoUpdate({
          target: [serviceCategories.businessId, serviceCategories.slug],
          set: {
            name: category.label,
            description: category.description,
            sortOrder,
            updatedAt: new Date(),
          },
        })
        .returning();
      categoryRows.set(category.id, row.id);
    }

    const serviceRows: Array<{ id: string; slug: string; isAddOn: boolean }> = [];
    for (const [sortOrder, treatment] of treatments.entries()) {
      const [row] = await tx
        .insert(services)
        .values({
          businessId: business.id,
          categoryId: categoryRows.get(treatment.category)!,
          slug: treatment.id,
          name: treatment.name,
          shortName: treatment.shortName,
          description: treatment.description,
          pricePence: treatment.price * 100,
          durationMinutes: treatment.duration,
          featured: treatment.featured ?? false,
          acceptsAddOns: treatment.acceptsAddOns ?? false,
          allowsProductRemoval: treatment.allowsProductRemoval ?? false,
          finderTags: treatment.finderTags,
          sortOrder,
        })
        .onConflictDoUpdate({
          target: [services.businessId, services.slug],
          set: {
            categoryId: categoryRows.get(treatment.category)!,
            name: treatment.name,
            shortName: treatment.shortName,
            description: treatment.description,
            pricePence: treatment.price * 100,
            durationMinutes: treatment.duration,
            featured: treatment.featured ?? false,
            acceptsAddOns: treatment.acceptsAddOns ?? false,
            allowsProductRemoval: treatment.allowsProductRemoval ?? false,
            finderTags: treatment.finderTags,
            sortOrder,
            updatedAt: new Date(),
          },
        })
        .returning({ id: services.id, slug: services.slug, isAddOn: services.isAddOn });
      serviceRows.push(row);
    }

    for (const [index, addOn] of addOns.entries()) {
      const [row] = await tx
        .insert(services)
        .values({
          businessId: business.id,
          categoryId: categoryRows.get('addons')!,
          slug: addOn.id,
          name: addOn.name,
          shortName: addOn.name,
          description: addOn.description,
          pricePence: addOn.price * 100,
          durationMinutes: addOn.duration,
          isAddOn: true,
          compatibleCategorySlugs: addOn.compatibleCategories,
          sortOrder: treatments.length + index,
        })
        .onConflictDoUpdate({
          target: [services.businessId, services.slug],
          set: {
            categoryId: categoryRows.get('addons')!,
            name: addOn.name,
            shortName: addOn.name,
            description: addOn.description,
            pricePence: addOn.price * 100,
            durationMinutes: addOn.duration,
            isAddOn: true,
            compatibleCategorySlugs: addOn.compatibleCategories,
            sortOrder: treatments.length + index,
            updatedAt: new Date(),
          },
        })
        .returning({ id: services.id, slug: services.slug, isAddOn: services.isAddOn });
      serviceRows.push(row);
    }

    const artistRows = new Map<string, string>();
    for (const [sortOrder, artist] of artistSeed.entries()) {
      const [artistRow] = await tx
        .insert(artists)
        .values({
          businessId: business.id,
          slug: artist.id,
          name: artist.name,
          role: artist.role,
          image: artist.image,
          specialties: artist.specialties,
          profile: artist.profile,
          selectedWork: artist.selectedWork,
          sortOrder,
        })
        .onConflictDoUpdate({
          target: [artists.businessId, artists.slug],
          set: {
            name: artist.name,
            role: artist.role,
            image: artist.image,
            specialties: artist.specialties,
            profile: artist.profile,
            selectedWork: artist.selectedWork,
            sortOrder,
            updatedAt: new Date(),
          },
        })
        .returning();
      artistRows.set(artist.name, artistRow.id);

      for (const service of serviceRows.filter((item) => !item.isAddOn)) {
        await tx
          .insert(artistServices)
          .values({
            businessId: business.id,
            artistId: artistRow.id,
            serviceId: service.id,
          })
          .onConflictDoNothing({
            target: [artistServices.artistId, artistServices.serviceId],
          });
      }

      for (const opening of siteConfig.openingHours) {
        if (opening.hours === 'Closed') continue;
        const { start, end } = splitHours(opening.hours);
        await tx
          .insert(workingHours)
          .values({
            businessId: business.id,
            artistId: artistRow.id,
            dayOfWeek: dayNumber[opening.days],
            startTime: start,
            endTime: end,
          })
          .onConflictDoUpdate({
            target: [workingHours.artistId, workingHours.dayOfWeek],
            set: { startTime: start, endTime: end, active: true, updatedAt: new Date() },
          });
      }
    }

    await tx
      .insert(businessSettings)
      .values({ businessId: business.id })
      .onConflictDoNothing({ target: businessSettings.businessId });

    await tx
      .insert(websiteSettings)
      .values({
        businessId: business.id,
        salonName: siteConfig.shortName,
        email: siteConfig.email,
        addressLine1: siteConfig.address.line1,
        city: siteConfig.address.city,
        postcode: siteConfig.address.postcode,
        country: siteConfig.address.country,
        instagramUrl: siteConfig.socials.find((social) => social.label === 'Instagram')?.href,
        emailUrl: siteConfig.socials.find((social) => social.label === 'Email')?.href,
        openingHours: siteConfig.openingHours,
      })
      .onConflictDoNothing({ target: websiteSettings.businessId });

    for (const [sortOrder, look] of lookbookSeed.entries()) {
      const treatmentId = serviceRows.find(
        (service) => service.slug === look.suggestedBaseTreatment && !service.isAddOn,
      )?.id;
      if (!treatmentId) throw new Error(`Lookbook treatment missing: ${look.suggestedBaseTreatment}`);
      await tx.insert(lookbookEntries).values({
        businessId: business.id,
        slug: look.id,
        name: look.name,
        image: look.image,
        altText: look.alt,
        category: look.category,
        complexity: look.complexity,
        description: look.description,
        treatmentId,
        addOnId: look.addOn
          ? serviceRows.find((service) => service.slug === look.addOn && service.isAddOn)?.id
          : null,
        artistId: artistRows.get(look.artist) ?? null,
        published: true,
        active: true,
        sortOrder,
      });
    }
    }

    const memberships = await tx
      .select()
      .from(businessMemberships)
      .where(
        and(
          eq(businessMemberships.businessId, business.id),
          eq(businessMemberships.userId, owner.id),
        ),
      );
    if (!memberships.length) throw new Error('Owner membership was not created.');
  });

  console.log('Atelier Union seed complete. No clients or appointments were created.');
} finally {
  await pool.end();
}
