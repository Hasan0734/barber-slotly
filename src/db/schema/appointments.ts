import { pgEnum, pgTable, uuid, varchar, text, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { shops } from "./shops.js";
import { services } from "./services.js";
import { sql } from "drizzle-orm";

export const appointmentStatusEnum = pgEnum("appointment_status", [
    "pending",
    "confirmed",
    "cancelled",
    "completed",
    "no_show"
])

export const paymentMethodEnum = pgEnum("payment_method", ["online", "pay_at_shop"
])

export const paymentStatusEnum = pgEnum("appointment_payment_status", [
    "unpaid", "pending", "paid", "failed", "refunded"
])


export const appointments = pgTable("appointments", {
    id: uuid('id').defaultRandom().primaryKey(),
    shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'set null' }),

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
    paymentMethod: paymentMethodEnum().notNull().default('pay_at_shop'),
    paymentStatus: paymentStatusEnum().notNull().default("unpaid"),
    bookingTokenHash: varchar("booking_token_hash", {
        length: 64
    }).notNull().unique(),


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
        .$onUpdate(() => new Date())


}, (table) => [
    index("apointments_shop_start_idx").on(table.shopId, table.startAt),
    index("appointments_shop_status_idx").on(table.shopId, table.status),
    check("appointments_valid_price", sql`${table.servicePrice} >= 0`),
    check("appointments_valid_duration", sql`${table.serviceDuration} >= 0`),
    check("appointments_valid_time", sql`${table.endAt} > ${table.startAt}`)

])