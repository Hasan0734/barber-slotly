import { pgTable, text, timestamp, uuid, varchar, index, integer, boolean, check } from "drizzle-orm/pg-core";
import { shops } from "./shops.js";
import { sql } from "drizzle-orm";


export const services = pgTable('services', {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
        .notNull()
        .references(() => shops.id, {
            onDelete: "cascade",
        }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text("description"),
    price: integer('price').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index("services_shop_id_idx").on(table.shopId),
    index("services_shop_active_idx").on(table.shopId, table.isActive),
    check("services_price_on_negative", sql`${table.price} >= 0`),
    check("services_duration_positive", sql`${table.durationMinutes} > 0`),
]);