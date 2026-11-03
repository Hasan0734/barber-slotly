CREATE TYPE "payment_method" AS ENUM('online', 'pay_at_shop');--> statement-breakpoint
CREATE TYPE "appointment_payment_status" AS ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "payment_provider" AS ENUM('stripe');--> statement-breakpoint
CREATE TYPE "payment_record_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"provider" "payment_provider" DEFAULT 'stripe'::"payment_provider" NOT NULL,
	"provider_session_id" varchar(255) UNIQUE,
	"provider_payment_intent_id" varchar(255) UNIQUE,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'bdt' NOT NULL,
	"status" "payment_record_status" DEFAULT 'pending'::"payment_record_status" NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_non_negative" CHECK ("amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "payment_method" "payment_method";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "payment_status" "appointment_payment_status" DEFAULT 'unpaid'::"appointment_payment_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "booking_token_hash" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "reservation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "service_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_booking_token_hash_key" UNIQUE("booking_token_hash");--> statement-breakpoint
CREATE INDEX "payments_appointment_id_idx" ON "payments" ("appointment_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT;