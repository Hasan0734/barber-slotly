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
    }),
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
    createdAt: timestamp("created_at", {
        withTimezone: true,
        mode: 'date'
    }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", {
        withTimezone: true,
        mode: "date"
    }).defaultNow().notNull()


}, (table) => [
    index("apointments_shop_start_idx").on(table.shopId, table.startAt),
    index("appointments_shop_status_idx").on(table.shopId, table.status),
    check("appointments_valid_price", sql`${table.servicePrice} >= 0`),
    check("appointments_valid_duration", sql`${table.serviceDuration} >= 0`),
    check("appointments_valid_time", sql`${table.endAt} > ${table.startAt}`)

])