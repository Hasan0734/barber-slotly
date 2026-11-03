import { index, pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { user } from "./auth.js";


export const guestSessions = pgTable("guest_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: varchar("token_hash", {
        length: 64
    })
        .notNull()
        .unique(),
    customerId: text("customer_id")
        .references(() => user.id, {
            onDelete: "set null"
        }),
    expiresAt: timestamp("expires_at", {
        withTimezone: true,
        mode: "date"
    }).notNull(),
    claimedAt: timestamp("claimed_at", {
        withTimezone: true,
        mode: "date"
    }),
    revokedAt: timestamp("revoked_at", {
        withTimezone: true,
        mode: "date"
    })
}, (table) => [
    index("guest_sessions_customer_id_idx").on(table.customerId)
])