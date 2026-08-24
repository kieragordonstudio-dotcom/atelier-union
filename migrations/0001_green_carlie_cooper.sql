CREATE TABLE "lookbook_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"slug" varchar(140) NOT NULL,
	"name" varchar(200) NOT NULL,
	"image" text NOT NULL,
	"alt_text" text NOT NULL,
	"category" varchar(40) NOT NULL,
	"complexity" varchar(20) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"treatment_id" uuid NOT NULL,
	"add_on_id" uuid,
	"artist_id" uuid,
	"published" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lookbook_entries" ADD CONSTRAINT "lookbook_entries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lookbook_entries" ADD CONSTRAINT "lookbook_entries_treatment_id_services_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lookbook_entries" ADD CONSTRAINT "lookbook_entries_add_on_id_services_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lookbook_entries" ADD CONSTRAINT "lookbook_entries_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lookbook_entries_business_slug_uidx" ON "lookbook_entries" USING btree ("business_id","slug");--> statement-breakpoint
CREATE INDEX "lookbook_entries_public_idx" ON "lookbook_entries" USING btree ("business_id","published","active","sort_order");--> statement-breakpoint
ALTER TABLE "lookbook_entries" ADD CONSTRAINT "lookbook_entries_valid_category" CHECK ("category" IN ('Minimal','French','Chrome','Colour','Art','Occasion'));--> statement-breakpoint
ALTER TABLE "lookbook_entries" ADD CONSTRAINT "lookbook_entries_valid_complexity" CHECK ("complexity" IN ('Low','Medium','High'));--> statement-breakpoint
CREATE UNIQUE INDEX "payments_appointment_kind_uidx" ON "payments" USING btree ("appointment_id","kind") WHERE "payments"."kind" <> 'adjustment';--> statement-breakpoint
INSERT INTO "lookbook_entries"
  ("business_id", "slug", "name", "image", "alt_text", "category", "complexity",
   "description", "treatment_id", "add_on_id", "artist_id", "published", "active", "sort_order")
SELECT b.id, seed.slug, seed.name, seed.image, seed.alt_text, seed.category, seed.complexity,
       seed.description, treatment.id, addon.id, artist.id, true, true, seed.sort_order
  FROM businesses b
  CROSS JOIN (VALUES
    ('micro-french', 'Micro French', '/images/work-micro-french.webp', 'Close hands with a refined pale manicure suitable for micro French.', 'French', 'Medium', 'Fine white detailing over a clean natural base.', 'signature-gel', 'micro-french', 'Maya Fraser', 0),
    ('oxblood', 'Oxblood', '/images/work-oxblood.webp', 'Close-up of hands with deep red polished nails.', 'Colour', 'Low', 'A deep lacquer colour with crisp shaping and high shine.', 'signature-gel', NULL, 'Maya Fraser', 1),
    ('natural-builder', 'Natural Builder', '/images/work-natural-builder.webp', 'Close hands showing neat natural nails with a soft finish.', 'Minimal', 'Low', 'A structured natural overlay for strength without bulk.', 'builder-gel-new', NULL, 'Maya Fraser', 2),
    ('soft-chrome', 'Soft Chrome', '/images/work-chrome.webp', 'Hands with polished nails and jewellery in an editorial close-up.', 'Chrome', 'Medium', 'A restrained reflective finish over a neutral base.', 'builder-gel-new', 'chrome', 'Sophie Reid', 3),
    ('studio-red', 'Studio Red', '/images/hero-manicure.webp', 'Two manicured hands gently touching in a beauty editorial image.', 'Occasion', 'Medium', 'A deep evening finish with a shorter natural shape.', 'signature-gel', NULL, 'Isla Morgan', 4),
    ('detail-line', 'Detail Line', '/images/sterile-tools.webp', 'Nail technician applying a detailed finish during a manicure.', 'Art', 'High', 'Fine-detail work booked with additional studio time.', 'soft-gel-extensions', 'detailed-art', 'Isla Morgan', 5)
  ) AS seed(slug, name, image, alt_text, category, complexity, description, treatment_slug, add_on_slug, artist_name, sort_order)
  JOIN services treatment ON treatment.business_id = b.id
    AND treatment.slug = seed.treatment_slug AND treatment.is_add_on = false
  LEFT JOIN services addon ON addon.business_id = b.id
    AND addon.slug = seed.add_on_slug AND addon.is_add_on = true
  LEFT JOIN artists artist ON artist.business_id = b.id AND artist.name = seed.artist_name
 WHERE b.slug = 'atelier-union'
ON CONFLICT ("business_id", "slug") DO NOTHING;
