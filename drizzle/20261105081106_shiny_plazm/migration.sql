CREATE TYPE "cancelled_by" AS ENUM('owner', 'customer');--> statement-breakpoint
CREATE TYPE "refund_request_status" AS ENUM('pending', 'processing', 'succeeded', 'rejected', 'failed');--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"token_hash" varchar(64) NOT NULL UNIQUE,
	"customer_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"reason" text,
	"status" "refund_request_status" DEFAULT 'pending'::"refund_request_status" NOT NULL,
	"processed_by" varchar(255),
	"requested_by" varchar(255),
	"rejection_reason" text,
	"provider_refund_id" varchar(255) UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_booking_token_hash_key";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "guest_session_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "customer_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_by" "cancelled_by";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "booking_token_hash";--> statement-breakpoint
CREATE INDEX "guest_sessions_customer_id_idx" ON "guest_sessions" ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_requests_one_active_per_payment" ON "refund_requests" ("payment_id") WHERE "status" IN ('pending', 'processing');--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_guest_session_id_guest_sessions_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_user_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_customer_id_user_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");