import { Hono } from "hono";
import db from "../db/index.js";
import { payments } from "../db/schema/payments.js";
import { appointments } from "../db/schema/appointments.js";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { shops } from "../db/schema/shops.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.get('/', authGuard, async (c) => {
    const user = c.get('user');

    const items = await db.select({
        ...getTableColumns(payments),
        serviceName: appointments.serviceName,
    }).from(payments)
        .innerJoin(
            appointments,
            eq(payments.appointmentId, appointments.id)
        )
        .innerJoin(
            shops,
            eq(appointments.shopId, shops.id)
        )
        .where(
            eq(shops.ownerId, user.id)
        )
        .orderBy(desc(payments.createdAt));

    return c.json({ success: true, data: items }, 200)

});

app.get('/:id', authGuard, async (c) => {
    const user = c.get("user");
    const id = c.req.param('id');

    const [payment] = await db.select({
        ...getTableColumns(payments),
        serviceName: appointments.serviceName,
    }).from(payments)
        .innerJoin(
            appointments,
            eq(payments.appointmentId, appointments.id)
        )
        .innerJoin(
            shops,
            eq(appointments.shopId, shops.id)
        )
        .where(
            and(
                eq(shops.ownerId, user.id),
                eq(payments.id, id)
            )
        )
        .limit(1);

    if (!payment) {
        throw new HTTPException(404, { message: "Payment not found" })
    }

    return c.json({ success: true, data: payment }, 200)

})

export default app;