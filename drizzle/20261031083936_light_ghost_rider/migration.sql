CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"shop_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" time,
	"close_time" time,
	"is_closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "business_hours_valid_key" CHECK (""day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "business_hours_valid_time" CHECK ("is_closed" = true OR (
            "open_time" IS NOT NULL
            AND "close_time" IS NOT NULL
            AND "open_time" < "close_time"
        ))
);
--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "services_shop_id_key";--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "duration_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "shop_id" SET DATA TYPE uuid USING "shop_id"::uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_shop_day_idx" ON "business_hours" ("shop_id","day_of_week");--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_shop_id_shops_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "services_duration_positive", ADD CONSTRAINT "services_duration_positive" CHECK ("duration_minutes" > 0);