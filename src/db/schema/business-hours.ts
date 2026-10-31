import {
    pgTable,
    uuid,
    integer,
    time,
    boolean,
    uniqueIndex,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { shops } from "./shops.js";


export const businessHours = pgTable("business_hours", {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
        .notNull()
        .references(() => shops.id,
            {
                onDelete: 'cascade'
            }),
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: time("open_time"),
    closeTime: time("close_time"),
    isClosed: boolean("is_closed").notNull().default(false)
}, (table) => [
    uniqueIndex("business_hours_shop_day_idx")
        .on(table.shopId, table.dayOfWeek),

    check(
        "business_hours_valid_day",
        sql`${table.dayOfWeek} BETWEEN 0 AND 6`
    ),

    check(
        "business_hours_valid_time",
        sql`${table.isClosed} = true OR (
        ${table.openTime} IS NOT NULL
        AND ${table.closeTime} IS NOT NULL
        AND ${table.openTime} < ${table.closeTime}
      )`
    ),
])
