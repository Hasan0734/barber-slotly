import { Hono } from "hono";
import db from "../db/index.js";
import { authGuard } from "../middleware/auth-guard.js";
import { appointments } from "../db/schema/appointments.js";
import { shops } from "../db/schema/shops.js";
import { and, eq, getTableColumns } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { validate } from "../lib/validate.js";
import { updateAppointmentStatusSchema, updateAppointSchema } from "../schemas/appointment.js";

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

app.get('/:id', authGuard, async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');

    const [appointment] = await db.select({
        ...getTableColumns(appointments),
        shopName: shops.name,
        shopPhone: shops.phone,
        shopAddress: shops.address

    })
        .from(appointments)
        .innerJoin(shops, eq(appointments.shopId, shops.id))
        .where(
            and(
                eq(appointments.id, id),
                eq(shops.ownerId, user.id),
            )
        )
        .limit(1);

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    return c.json({ success: true, data: appointment }, 200)
})

app.patch('/:id/status', authGuard, validate('json', updateAppointmentStatusSchema), async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const appointment = await db.update(appointments).set(body)
        .from(shops)
        .where(
            and(
                eq(appointments.id, id),
                eq(appointments.shopId, shops.id),
                eq(shops.ownerId, user.id)
            )
        ).returning({
            ...getTableColumns(appointments),
            shopName: shops.name,
            shopPhone: shops.phone,
            shopAddress: shops.address
        });

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }
    return c.json({
        success: true,
        message: "Appointment status changed",
        data: appointment
    }, 200)
})

app.patch('/:id', authGuard, validate("json", updateAppointSchema), async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = c.req.valid('json')

    const appointment = await db.update(appointments)
        .set(body)
        .from(shops)
        .where(
            and(
                eq(appointments.id, id),
                eq(appointments.shopId, shops.id),
                eq(shops.ownerId, user.id),
            )
        ).returning(
            {
                ...getTableColumns(appointments),
                shopName: shops.name,
                shopPhone: shops.phone,
                shopAddress: shops.address
            }
        );

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    return c.json({
        success: true,
        message: "Appointment successfully updated",
        data: appointment
    }, 200)
})


export default app;