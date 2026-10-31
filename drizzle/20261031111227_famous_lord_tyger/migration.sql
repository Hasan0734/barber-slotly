CREATE TYPE "appointment_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"shop_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_name" varchar(150),
	"customer_phone" varchar(30),
	"customer_email" varchar(255),
	"customerNode" text,
	"service_name" varchar(150),
	"service_price" integer NOT NULL,
	"service_duration" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'pending'::"appointment_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_valid_price" CHECK ("service_price" >= 0),
	CONSTRAINT "appointments_valid_duration" CHECK ("service_duration" >= 0),
	CONSTRAINT "appointments_valid_time" CHECK ("end_at" > "start_at")
);
--> statement-breakpoint
ALTER TABLE "business_hours" DROP CONSTRAINT "business_hours_valid_key";--> statement-breakpoint
CREATE INDEX "apointments_shop_start_idx" ON "appointments" ("shop_id","start_at");--> statement-breakpoint
CREATE INDEX "appointments_shop_status_idx" ON "appointments" ("shop_id","status");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_shop_id_shops_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_valid_day" CHECK ("day_of_week" BETWEEN 0 AND 6);--> statement-breakpoint
ALTER TABLE "business_hours" DROP CONSTRAINT "business_hours_valid_time", ADD CONSTRAINT "business_hours_valid_time" CHECK ("is_closed" = true OR (
        "open_time" IS NOT NULL
        AND "close_time" IS NOT NULL
        AND "open_time" < "close_time"
      ));