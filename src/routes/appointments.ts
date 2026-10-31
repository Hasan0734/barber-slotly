import { Hono } from "hono";
import { authGuard } from "../middleware/auth-guard.js";
import db from "../db/index.js";
import { appointments } from "../db/schema/appointments.js";
import { shops } from "../db/schema/shops.js";
import { and, eq, getTableColumns } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.get('/', authGuard, async (c) => {

    const user = c.get('user');

    const lists = await db.select({
        ...getTableColumns(appointments)
    })
        .from(appointments)
        .innerJoin(shops, eq(appointments.shopId, shops.id))
        .where(eq(shops.ownerId, user.id));

    return c.json({ success: true, data: lists ?? [] }, 200)
})

app.get('/:id/status', authGuard, async (c) => {

    const user = c.get('user');
    const id = c.req.param('id');

    const [appointment] = await db.select({
        ...getTableColumns(appointments)
    })
        .from(appointments)
        .innerJoin(shops, eq(appointments.shopId, shops.id))
        .where(
            and(
                eq(shops.ownerId, user.id),
                eq(appointments.id, id)
            )
        );

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    return c.json({ success: true, data: appointment }, 200)
})

app.get('/:id', authGuard, async (c) => {

    const user = c.get('user');
    const id = c.req.param('id');

    const [appointment] = await db.select({
        ...getTableColumns(appointments)
    })
        .from(appointments)
        .innerJoin(shops, eq(appointments.shopId, shops.id))
        .where(
            and(
                eq(shops.ownerId, user.id),
                eq(appointments.id, id)
            )
        );

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    return c.json({ success: true, data: appointment }, 200)
})

export default app;