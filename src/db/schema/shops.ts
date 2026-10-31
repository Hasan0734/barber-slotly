import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { user } from './auth.js'

export const shops = pgTable('shops', {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text('owner_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text("description"),
    address: text("address"),
    phone: varchar('phone', { length: 20 }),
    timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Dhaka'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
})