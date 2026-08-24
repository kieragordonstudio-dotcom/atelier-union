import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const membershipRole = pgEnum('membership_role', ['owner', 'admin']);
export const appointmentStatus = pgEnum('appointment_status', [
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);
export const paymentStatus = pgEnum('payment_status', [
  'unpaid',
  'deposit_recorded',
  'paid',
  'refunded',
]);
export const paymentKind = pgEnum('payment_kind', [
  'deposit',
  'balance',
  'refund',
  'adjustment',
]);
export const calendarBlockType = pgEnum('calendar_block_type', [
  'time_off',
  'blocked',
]);

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 180 }).notNull(),
    timezone: varchar('timezone', { length: 80 }).notNull().default('Europe/London'),
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 80 }),
    addressLine1: varchar('address_line_1', { length: 200 }),
    city: varchar('city', { length: 120 }),
    postcode: varchar('postcode', { length: 32 }),
    country: varchar('country', { length: 120 }),
    ...timestamps,
  },
  (table) => [uniqueIndex('businesses_slug_uidx').on(table.slug)],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull(),
    normalizedEmail: varchar('normalized_email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    active: boolean('active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex('users_normalized_email_uidx').on(table.normalizedEmail)],
);

export const businessMemberships = pgTable(
  'business_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: membershipRole('role').notNull().default('owner'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('memberships_business_user_uidx').on(table.businessId, table.userId),
    index('memberships_user_idx').on(table.userId),
  ],
);

export const artists = pgTable(
  'artists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 180 }).notNull(),
    role: varchar('role', { length: 180 }).notNull(),
    image: text('image').notNull(),
    specialties: text('specialties').array().notNull().default(sql`ARRAY[]::text[]`),
    profile: text('profile').notNull().default(''),
    selectedWork: text('selected_work').array().notNull().default(sql`ARRAY[]::text[]`),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('artists_business_slug_uidx').on(table.businessId, table.slug),
    index('artists_business_active_idx').on(table.businessId, table.active),
  ],
);

export const serviceCategories = pgTable(
  'service_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 180 }).notNull(),
    description: text('description').notNull().default(''),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('service_categories_business_slug_uidx').on(
      table.businessId,
      table.slug,
    ),
    index('service_categories_business_idx').on(table.businessId),
  ],
);

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => serviceCategories.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 140 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    shortName: varchar('short_name', { length: 120 }).notNull(),
    description: text('description').notNull().default(''),
    pricePence: integer('price_pence').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    isAddOn: boolean('is_add_on').notNull().default(false),
    featured: boolean('featured').notNull().default(false),
    acceptsAddOns: boolean('accepts_add_ons').notNull().default(false),
    allowsProductRemoval: boolean('allows_product_removal').notNull().default(false),
    compatibleCategorySlugs: text('compatible_category_slugs')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    finderTags: text('finder_tags').array().notNull().default(sql`ARRAY[]::text[]`),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('services_business_slug_uidx').on(table.businessId, table.slug),
    index('services_business_active_idx').on(table.businessId, table.active),
    index('services_category_idx').on(table.categoryId),
  ],
);

export const artistServices = pgTable(
  'artist_services',
  {
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.artistId, table.serviceId] }),
    index('artist_services_business_idx').on(table.businessId),
  ],
);

export const workingHours = pgTable(
  'working_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    active: boolean('active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('working_hours_artist_day_uidx').on(table.artistId, table.dayOfWeek),
    index('working_hours_business_idx').on(table.businessId),
  ],
);

export const timeOff = pgTable(
  'time_off',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    type: calendarBlockType('type').notNull().default('time_off'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    reason: varchar('reason', { length: 240 }).notNull().default('Unavailable'),
    ...timestamps,
  },
  (table) => [
    index('time_off_business_range_idx').on(table.businessId, table.startsAt, table.endsAt),
    index('time_off_artist_range_idx').on(table.artistId, table.startsAt, table.endsAt),
  ],
);

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 320 }),
    normalizedEmail: varchar('normalized_email', { length: 320 }),
    phone: varchar('phone', { length: 80 }),
    normalizedPhone: varchar('normalized_phone', { length: 80 }),
    notes: text('notes').notNull().default(''),
    anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('clients_business_email_uidx')
      .on(table.businessId, table.normalizedEmail)
      .where(sql`${table.normalizedEmail} is not null`),
    uniqueIndex('clients_business_phone_uidx')
      .on(table.businessId, table.normalizedPhone)
      .where(sql`${table.normalizedPhone} is not null`),
    index('clients_business_name_idx').on(table.businessId, table.name),
  ],
);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    totalPence: integer('total_pence').notNull(),
    depositPence: integer('deposit_pence').notNull().default(0),
    paymentStatus: paymentStatus('payment_status').notNull().default('unpaid'),
    status: appointmentStatus('status').notNull().default('confirmed'),
    customerNote: text('customer_note').notNull().default(''),
    internalNotes: text('internal_notes').notNull().default(''),
    bookingSource: varchar('booking_source', { length: 40 }).notNull().default('public'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('appointments_business_start_idx').on(table.businessId, table.startsAt),
    index('appointments_artist_range_idx').on(table.artistId, table.startsAt, table.endsAt),
    index('appointments_client_idx').on(table.clientId),
    index('appointments_status_idx').on(table.businessId, table.status),
  ],
);

export const appointmentServices = pgTable(
  'appointment_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
    serviceName: varchar('service_name', { length: 200 }).notNull(),
    serviceSlug: varchar('service_slug', { length: 140 }).notNull(),
    serviceType: varchar('service_type', { length: 40 }).notNull().default('treatment'),
    durationMinutes: integer('duration_minutes').notNull(),
    pricePence: integer('price_pence').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('appointment_services_appointment_idx').on(table.appointmentId),
    index('appointment_services_business_idx').on(table.businessId),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    amountPence: integer('amount_pence').notNull(),
    kind: paymentKind('kind').notNull(),
    status: paymentStatus('status').notNull(),
    note: text('note').notNull().default(''),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    index('payments_business_recorded_idx').on(table.businessId, table.recordedAt),
    index('payments_appointment_idx').on(table.appointmentId),
    uniqueIndex('payments_appointment_kind_uidx')
      .on(table.appointmentId, table.kind)
      .where(sql`${table.kind} <> 'adjustment'`),
  ],
);

export const businessSettings = pgTable(
  'business_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    minimumNoticeHours: integer('minimum_notice_hours').notNull().default(2),
    maximumAdvanceDays: integer('maximum_advance_days').notNull().default(120),
    bufferMinutes: integer('buffer_minutes').notNull().default(15),
    cancellationCutoffHours: integer('cancellation_cutoff_hours').notNull().default(24),
    depositPence: integer('deposit_pence').notNull().default(1500),
    taxSetAsidePercent: integer('tax_set_aside_percent').notNull().default(20),
    ...timestamps,
  },
  (table) => [uniqueIndex('business_settings_business_uidx').on(table.businessId)],
);

export const websiteSettings = pgTable(
  'website_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    salonName: varchar('salon_name', { length: 180 }).notNull(),
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 80 }),
    addressLine1: varchar('address_line_1', { length: 200 }),
    city: varchar('city', { length: 120 }),
    postcode: varchar('postcode', { length: 32 }),
    country: varchar('country', { length: 120 }),
    instagramUrl: text('instagram_url'),
    emailUrl: text('email_url'),
    openingHours: jsonb('opening_hours').notNull().default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (table) => [uniqueIndex('website_settings_business_uidx').on(table.businessId)],
);

export const lookbookEntries = pgTable(
  'lookbook_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 140 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    image: text('image').notNull(),
    altText: text('alt_text').notNull(),
    category: varchar('category', { length: 40 }).notNull(),
    complexity: varchar('complexity', { length: 20 }).notNull(),
    description: text('description').notNull().default(''),
    treatmentId: uuid('treatment_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    addOnId: uuid('add_on_id').references(() => services.id, { onDelete: 'set null' }),
    artistId: uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
    published: boolean('published').notNull().default(true),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('lookbook_entries_business_slug_uidx').on(table.businessId, table.slug),
    index('lookbook_entries_public_idx').on(
      table.businessId,
      table.published,
      table.active,
      table.sortOrder,
    ),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 160 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    ipAddress: varchar('ip_address', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_logs_business_created_idx').on(table.businessId, table.createdAt)],
);

export const sessions = pgTable(
  'session',
  {
    sid: varchar('sid', { length: 255 }).primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire', { precision: 6 }).notNull(),
  },
  (table) => [index('session_expire_idx').on(table.expire)],
);

export type Business = typeof businesses.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type LookbookEntry = typeof lookbookEntries.$inferSelect;
