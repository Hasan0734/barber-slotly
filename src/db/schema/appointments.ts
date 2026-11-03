import { pgEnum, pgTable, uuid, varchar, text, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { shops } from "./shops.js";
import { services } from "./services.js";
import { sql } from "drizzle-orm";
import { guestSessions } from "./guest-sessions.js";
import { user } from "./auth.js";

export const appointmentStatusEnum = pgEnum("appointment_status", [
    "pending",
    "confirmed",
    "cancelled",
    "completed",
    "no_show"
])

export const paymentMethodEnum = pgEnum("payment_method", [
    "online",
    "pay_at_shop"
])

export const paymentStatusEnum = pgEnum("appointment_payment_status", [
    "unpaid",
    "pending",
    "paid",
    "failed",
    "refunded"
])

export const cancelledByEnum = pgEnum("cancelled_by", ["owner", "customer"])


export const appointments = pgTable("appointments", {
    id: uuid('id').defaultRandom().primaryKey(),
    shopId: uuid('shop_id')
        .notNull()
        .references(() => shops.id, {
            onDelete: 'cascade'
        }),
    serviceId: uuid('service_id')
        .notNull()
        .references(() => services.id, {
            onDelete: 'set null'
        }),

    // customer information
    customerName: varchar("customer_name", { length: 150 }),
    customerPhone: varchar("customer_phone", { length: 30 }),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerNote: text("customerNode"),

    // Service snapshot
    serviceName: varchar("service_name", {
        length: 150
    }).notNull(),
    servicePrice: integer("service_price").notNull(),
    serviceDuration: integer("service_duration").notNull(),

    //Appointment time
    startAt: timestamp("start_at", {
        withTimezone: true,
        mode: 'date'
    }).notNull(),
    endAt: timestamp("end_at", {
        withTimezone: true,
        mode: 'date'
    }).notNull(),
    status: appointmentStatusEnum().notNull().default('pending'),

    //payment
    paymentMethod: paymentMethodEnum("payment_method"),
    paymentStatus: paymentStatusEnum("payment_status")
        .notNull()
        .default("unpaid"),

    reservationExpiresAt: timestamp("reservation_expires_at", {
        withTimezone: true,
        mode: "date"
    }),
    createdAt: timestamp("created_at", {
        withTimezone: true,
        mode: 'date'
    }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
        mode: "date"
    }).defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),

    guestSessionId: uuid("guest_session_id")
        .references(() => guestSessions.id, {
            onDelete: "set null"
        }),
    customerId: text("customer_id")
        .references(() => user.id, {
            onDelete: "set null"
        }),

    cancelledAt: timestamp("cancelled_at", {
        withTimezone: true,
        mode: "date"
    }),
    cancelledBy: cancelledByEnum("cancelled_by"),

    cancellationReason: text("cancellation_reason")


}, (table) => [
    index("apointments_shop_start_idx").on(table.shopId, table.startAt),
    index("appointments_shop_status_idx").on(table.shopId, table.status),
    check("appointments_valid_price", sql`${table.servicePrice} >= 0`),
    check("appointments_valid_duration", sql`${table.serviceDuration} >= 0`),
    check("appointments_valid_time", sql`${table.endAt} > ${table.startAt}`)

])