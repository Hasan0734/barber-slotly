CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"shop_id" text NOT NULL UNIQUE,
	"name" varchar(120) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"duration" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_price_on_negative" CHECK ("price" >= 0),
	CONSTRAINT "services_duration_positive" CHECK ("duration" > 0)
);
--> statement-breakpoint
CREATE INDEX "services_shop_id_idx" ON "services" ("shop_id");--> statement-breakpoint
CREATE INDEX "services_shop_active_idx" ON "services" ("shop_id","is_active");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_shop_id_shops_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;