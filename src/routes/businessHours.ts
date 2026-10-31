import { Hono } from "hono";
import db from "../db/index.js";
import { businessHours } from "../db/schema/business-hours.js";
import { authGuard } from "../middleware/auth-guard.js";
import { shops } from "../db/schema/shops.js";
import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { validate } from "../lib/validate.js";
import { businessHourSchema, updateBusinessHoursSchema } from "../schemas/business-hours.js";

const app = new Hono();

app.post

app.get('/', authGuard, async (c) => {
    const user = c.get('user');

    const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id));
    if (!shop) {
        throw new HTTPException(404, { message: "You don't have shop" })
    }
    const hours = await db.select().from(businessHours).where(eq(businessHours.shopId, shop.id));
    return c.json({ hours, success: true }, 200);


})

app.put('/', authGuard, validate('json', updateBusinessHoursSchema), async (c) => {
    const user = c.get('user');
    const { hours } = c.req.valid('json');
    const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id));
    if (!shop) {
        throw new HTTPException(404, { message: "You don't have shop" })
    }

    const res = await db.insert(businessHours)
        .values(
            hours.map((hour) => ({
                shopId: shop.id,
                ...hour
            }))
        ).onConflictDoUpdate({
            target: [
                businessHours.shopId,
                businessHours.dayOfWeek
            ],
            set: {
                openTime: sql`excluded.open_time`,
                closeTime: sql`excluded.close_time`,
                isClosed: sql`excluded.is_closed`,
            }
        }).returning();

    return c.json({ data: res, message: "Business hours saved successfully", success: true }, 200)

})


export default app;