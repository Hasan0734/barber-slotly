import { check, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { appointments } from "./appointments.js";
import { payments } from "./payments.js";
import { sql } from "drizzle-orm";

export const refundRequestStatusEnum = pgEnum(
    "refund_request_status",
    [
        "pending",
        "processing",
        "succeeded",
        "rejected",
        "failed",
    ],
);


export const refundRequests = pgTable("refund_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id").notNull().references(() => appointments.id),
    paymentId: uuid("payment_id").notNull().references(() => payments.id),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    reason: text("reason"),
    status: refundRequestStatusEnum()
        .notNull()
        .default("pending"),
    processedBy: varchar("processed_by", { length: 255 }),
    requestedBy: varchar("requested_by", { length: 255 }),
    rejectionReason: text("rejection_reason"),
    providerRefundId: varchar("provider_refund_id", {
        length: 255,
    }).unique(),
    createdAt: timestamp("created_at", {
        withTimezone: true,
    }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    }).defaultNow().notNull(),

}, (table) => [
    uniqueIndex("refund_requests_one_active_per_payment")
        .on(table.paymentId)
        .where(sql`${table.status} IN ('pending', 'processing')`),
    check(
        "refund_requests_amount_positive",
        sql`${table.amount} > 0`
    )
])