import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import * as schema from '../../server/db/schema.js';
import type { DatabaseContext } from '../../server/db/database.js';

export async function createTestDatabase() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    impure: true,
    implementation: randomUUID,
  });
  memory.public.registerFunction({
    name: 'hashtext',
    args: [DataType.text],
    returns: DataType.integer,
    implementation: () => 1,
  });
  memory.public.registerFunction({
    name: 'pg_advisory_xact_lock',
    args: [DataType.integer],
    returns: DataType.integer,
    impure: true,
    implementation: () => 1,
  });

  const migrationDirectory = new URL('../../migrations/', import.meta.url);
  for (const filename of readdirSync(migrationDirectory).filter((name) => name.endsWith('.sql')).sort()) {
    const migration = readFileSync(new URL(filename, migrationDirectory), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) {
      if (
        !statement.trim() ||
        statement.includes('CREATE EXTENSION') ||
        statement.includes('appointments_no_artist_overlap') ||
        statement.includes('INSERT INTO "lookbook_entries"')
      ) {
        continue;
      }
      memory.public.none(statement);
    }
  }

  const adapter = memory.adapters.createPg();
  const originalQuery = adapter.Pool.prototype.query;
  adapter.Pool.prototype.query = function patchedQuery(
    query: Parameters<typeof originalQuery>[0],
    ...parameters: unknown[]
  ) {
    if (typeof query === 'object' && query) {
      const { types: _types, rowMode, ...supportedQuery } = query as Record<string, unknown>;
      const result = originalQuery.call(this, supportedQuery, ...parameters);
      if (rowMode === 'array' && result instanceof Promise) {
        return result.then((queryResult) => ({
          ...queryResult,
          rows: queryResult.rows.map((row) => Object.values(row as Record<string, unknown>)),
        }));
      }
      return result;
    }
    return originalQuery.call(this, query, ...parameters);
  } as typeof originalQuery;
  const pool = new adapter.Pool() as unknown as Pool;
  const db = drizzle(pool, { schema });
  return { memory, pool, db } as DatabaseContext & { memory: typeof memory };
}

export async function seedBusiness(
  context: DatabaseContext,
  input: { slug: string; name: string },
) {
  const [business] = await context.db
    .insert(schema.businesses)
    .values({ slug: input.slug, name: input.name, timezone: 'Europe/London' })
    .returning();
  await context.db.insert(schema.businessSettings).values({
    businessId: business.id,
    minimumNoticeHours: 0,
    maximumAdvanceDays: 365,
    bufferMinutes: 0,
    depositPence: 1500,
  });
  return business;
}

export async function seedBookingSetup(context: DatabaseContext, businessId: string) {
  const [category] = await context.db
    .insert(schema.serviceCategories)
    .values({ businessId, slug: 'manicures', name: 'Manicures' })
    .returning();
  const [service] = await context.db
    .insert(schema.services)
    .values({
      businessId,
      categoryId: category.id,
      slug: 'signature-gel',
      name: 'The Signature Gel',
      shortName: 'Signature Gel',
      pricePence: 4200,
      durationMinutes: 60,
      allowsProductRemoval: true,
    })
    .returning();
  const [artist] = await context.db
    .insert(schema.artists)
    .values({
      businessId,
      slug: 'maya',
      name: 'Maya Fraser',
      role: 'Senior Nail Artist',
      image: '/images/artist-maya.webp',
    })
    .returning();
  await context.db.insert(schema.artistServices).values({
    businessId,
    artistId: artist.id,
    serviceId: service.id,
  });
  return { category, service, artist };
}
