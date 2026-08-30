import { hash } from 'bcryptjs';
import { and, eq, gt, inArray, like, lt } from 'drizzle-orm';
import { DateTime } from 'luxon';
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
  appointments,
  appointmentServices,
  businesses,
  businessMemberships,
  businessSettings,
  clients,
  lookbookEntries,
  payments,
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

const demoClients = [
  ['Amelia Demo', 'amelia.demo@example.com', '+44 7700 900101'],
  ['Beth Example', 'beth.example@example.com', '+44 7700 900102'],
  ['Cara Sample', 'cara.sample@example.com', '+44 7700 900103'],
  ['Daisy Demo', 'daisy.demo@example.com', '+44 7700 900104'],
  ['Eva Example', 'eva.example@example.com', '+44 7700 900105'],
  ['Freya Sample', 'freya.sample@example.com', '+44 7700 900106'],
  ['Grace Demo', 'grace.demo@example.com', '+44 7700 900107'],
  ['Holly Example', 'holly.example@example.com', '+44 7700 900108'],
  ['Imogen Sample', 'imogen.sample@example.com', '+44 7700 900109'],
] as const;

const demoAppointmentCandidates = [
  { dayOffset: -30, hour: 10 },
  { dayOffset: -27, hour: 13 },
  { dayOffset: -24, hour: 15 },
  { dayOffset: -21, hour: 11 },
  { dayOffset: -18, hour: 14 },
  { dayOffset: -15, hour: 16 },
  { dayOffset: -12, hour: 10 },
  { dayOffset: -10, hour: 13 },
  { dayOffset: -8, hour: 15 },
  { dayOffset: -6, hour: 11 },
  { dayOffset: -4, hour: 14 },
  { dayOffset: -2, hour: 16 },
  { dayOffset: 1, hour: 10 },
  { dayOffset: 2, hour: 13 },
  { dayOffset: 3, hour: 15 },
  { dayOffset: 5, hour: 11 },
  { dayOffset: 6, hour: 14 },
  { dayOffset: 8, hour: 16 },
  { dayOffset: 10, hour: 10 },
  { dayOffset: 12, hour: 13 },
  { dayOffset: 14, hour: 15 },
  { dayOffset: 16, hour: 11 },
  { dayOffset: 18, hour: 14 },
  { dayOffset: 20, hour: 16 },
] as const;

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

    const [demoArtists, demoServices, settingsRows] = await Promise.all([
      tx
        .select({ id: artists.id, slug: artists.slug })
        .from(artists)
        .where(eq(artists.businessId, business.id)),
      tx
        .select({
          id: services.id,
          slug: services.slug,
          name: services.name,
          durationMinutes: services.durationMinutes,
          pricePence: services.pricePence,
        })
        .from(services)
        .where(
          and(
            eq(services.businessId, business.id),
            eq(services.isAddOn, false),
          ),
        ),
      tx
        .select({ depositPence: businessSettings.depositPence })
        .from(businessSettings)
        .where(eq(businessSettings.businessId, business.id))
        .limit(1),
    ]);
    if (!demoArtists.length || !demoServices.length) {
      throw new Error('Artists and services must exist before demo activity can be seeded.');
    }

    await tx
      .update(clients)
      .set({ notes: 'Synthetic demonstration client. Not a real person.' })
      .where(
        and(
          eq(clients.businessId, business.id),
          inArray(
            clients.normalizedEmail,
            demoClients.map(([, email]) => email.toLowerCase()),
          ),
        ),
      );

    const preferredServiceSlugs = [
      'signature-gel',
      'builder-gel-new',
      'gel-pedicure',
      'builder-gel-infill',
      'soft-gel-extensions',
      'naked-manicure',
    ];
    const orderedDemoServices = preferredServiceSlugs
      .map((slug) => demoServices.find((service) => service.slug === slug))
      .filter((service): service is (typeof demoServices)[number] => Boolean(service));
    const availableDemoServices = orderedDemoServices.length ? orderedDemoServices : demoServices;
    const depositPence = settingsRows[0]?.depositPence ?? 1500;
    const today = DateTime.now().setZone('Europe/London').startOf('day');
    const existingDemoAppointments = await tx
      .select({ internalNotes: appointments.internalNotes })
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, business.id),
          like(appointments.internalNotes, 'KGD synthetic demo appointment %'),
        ),
      );
    const existingDemoMarkers = new Set(
      existingDemoAppointments.map((appointment) => appointment.internalNotes),
    );
    let seededAppointmentCount = existingDemoMarkers.size;

    for (const [candidateIndex, candidate] of demoAppointmentCandidates.entries()) {
      if (seededAppointmentCount >= 18) break;
      const marker = `KGD synthetic demo appointment ${String(candidateIndex + 1).padStart(2, '0')}`;
      if (existingDemoMarkers.has(marker)) continue;

      let startsAt = today
        .plus({ days: candidate.dayOffset })
        .set({ hour: candidate.hour, minute: candidateIndex % 2 === 0 ? 0 : 30 });
      if (startsAt.weekday === 7) {
        startsAt = startsAt.plus({ days: candidate.dayOffset < 0 ? -1 : 1 });
      }
      const artist = demoArtists[candidateIndex % demoArtists.length];
      const service = availableDemoServices[candidateIndex % availableDemoServices.length];
      const endsAt = startsAt.plus({ minutes: service.durationMinutes });
      const isFuture = startsAt > DateTime.now().setZone('Europe/London');
      const status = isFuture
        ? 'confirmed'
        : candidateIndex % 9 === 2
          ? 'cancelled'
          : candidateIndex % 10 === 4
            ? 'no_show'
            : 'completed';
      const paymentStatus = status === 'completed'
        ? 'paid'
        : status === 'cancelled' && candidateIndex % 2 === 0
          ? 'refunded'
          : status === 'confirmed' && candidateIndex % 3 === 1
            ? 'unpaid'
            : 'deposit_recorded';

      if (status === 'confirmed' || status === 'completed') {
        const [conflict] = await tx
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.artistId, artist.id),
              inArray(appointments.status, ['confirmed', 'completed']),
              lt(appointments.startsAt, endsAt.toUTC().toJSDate()),
              gt(appointments.endsAt, startsAt.toUTC().toJSDate()),
            ),
          )
          .limit(1);
        if (conflict) continue;
      }

      const clientSeed = demoClients[candidateIndex % demoClients.length];
      const normalizedEmail = clientSeed[1].toLowerCase();
      let [client] = await tx
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.businessId, business.id),
            eq(clients.normalizedEmail, normalizedEmail),
          ),
        )
        .limit(1);
      if (!client) {
        [client] = await tx
          .insert(clients)
          .values({
            businessId: business.id,
            name: clientSeed[0],
            email: clientSeed[1],
            normalizedEmail,
            phone: clientSeed[2],
            normalizedPhone: clientSeed[2].replace(/\s/g, ''),
            notes: 'Synthetic demonstration client. Not a real person.',
          })
          .returning();
      }

      const effectiveDeposit = Math.min(depositPence, service.pricePence);
      const [appointment] = await tx
        .insert(appointments)
        .values({
          businessId: business.id,
          clientId: client.id,
          artistId: artist.id,
          startsAt: startsAt.toUTC().toJSDate(),
          endsAt: endsAt.toUTC().toJSDate(),
          durationMinutes: service.durationMinutes,
          totalPence: service.pricePence,
          depositPence: effectiveDeposit,
          paymentStatus,
          status,
          customerNote: 'Synthetic demonstration appointment.',
          internalNotes: marker,
          bookingSource: 'demo-seed',
          cancelledAt: status === 'cancelled' ? startsAt.minus({ days: 1 }).toUTC().toJSDate() : null,
        })
        .returning();
      await tx.insert(appointmentServices).values({
        businessId: business.id,
        appointmentId: appointment.id,
        serviceId: service.id,
        serviceName: service.name,
        serviceSlug: service.slug,
        serviceType: 'treatment',
        durationMinutes: service.durationMinutes,
        pricePence: service.pricePence,
      });

      const recordedAt = isFuture
        ? DateTime.now().minus({ hours: candidateIndex + 1 }).toJSDate()
        : startsAt.minus({ days: 2 }).toUTC().toJSDate();
      if (paymentStatus === 'deposit_recorded' || paymentStatus === 'refunded' || paymentStatus === 'paid') {
        await tx.insert(payments).values({
          businessId: business.id,
          appointmentId: appointment.id,
          amountPence: effectiveDeposit,
          kind: 'deposit',
          status: paymentStatus === 'deposit_recorded' ? 'deposit_recorded' : 'paid',
          note: 'Synthetic demo payment.',
          recordedAt,
        });
      }
      if (paymentStatus === 'paid') {
        await tx.insert(payments).values({
          businessId: business.id,
          appointmentId: appointment.id,
          amountPence: service.pricePence - effectiveDeposit,
          kind: 'balance',
          status: 'paid',
          note: 'Synthetic demo payment.',
          recordedAt,
        });
      }
      if (paymentStatus === 'refunded') {
        await tx.insert(payments).values({
          businessId: business.id,
          appointmentId: appointment.id,
          amountPence: -effectiveDeposit,
          kind: 'refund',
          status: 'refunded',
          note: 'Synthetic demo refund.',
          recordedAt,
        });
      }
      seededAppointmentCount += 1;
    }

    if (seededAppointmentCount < 15) {
      throw new Error(`Only ${seededAppointmentCount} synthetic demo appointments could be seeded.`);
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

  console.log('Atelier Union seed complete, including idempotent synthetic demo activity.');
} finally {
  await pool.end();
}
