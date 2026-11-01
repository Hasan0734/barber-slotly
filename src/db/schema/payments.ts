import { check, index, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { appointments } from "./appointments.js";
import { sql } from "drizzle-orm";


export const paymentStatusEnum = pgEnum("payment_record_status", [
    "pending",
    "succeeded",
    "failed",
    "refunded",
]);

export const paymentProviderEnum = pgEnum(
    "payment_provider",
    ["stripe"],
);

export const payments = pgTable("payments", {
    id: uuid("id").defaultRandom().primaryKey(),

    appointmentId: uuid("appointment_id")
        .notNull()
        .references(() => appointments.id, {
            onDelete: "restrict",
        }),

    provider: paymentProviderEnum("provider")
        .notNull()
        .default("stripe"),

    providerSessionId: varchar("provider_session_id", {
        length: 255,
    }).unique(),

    providerPaymentIntentId: varchar(
        "provider_payment_intent_id",
        {
            length: 255,
        },
    ).unique(),

    amount: integer("amount").notNull(),

    currency: varchar("currency", {
        length: 3,
    })
        .notNull()
        .default("bdt"),

    status: paymentStatusEnum("status")
        .notNull()
        .default("pending"),

    paidAt: timestamp("paid_at", {
        withTimezone: true,
        mode: "date",
    }),

    createdAt: timestamp("created_at", {
        withTimezone: true,
        mode: "date",
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
        mode: "date",
    })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
}, (table) => [
    check(
        "payments_amount_non_negative",
        sql`${table.amount} >= 0`,
    ),
    index("payments_appointment_id_idx").on(
        table.appointmentId,
    ),
])