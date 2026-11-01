import { Hono } from "hono";
import db from "../db/index.js";
import { authGuard } from "../middleware/auth-guard.js";
import { appointments } from "../db/schema/appointments.js";
import { shops } from "../db/schema/shops.js";
import { and, asc, count, desc, eq, getTableColumns, ilike } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { validate } from "../lib/validate.js";
import { appointmentQuerySchema, updateAppointmentStatusSchema, updateAppointSchema } from "../schemas/appointment.js";
import { changeAppointmentStatus } from "../services/appointment.js";

const app = new Hono();

app.get('/', authGuard, validate('query', appointmentQuerySchema), async (c) => {
    const user = c.get('user');
    const query = c.req.valid('query');
    const { page, limit, status, search, sort } = query;
    const offset = (page - 1) * limit;

    const conditions = [
        eq(appointments.shopId, shops.id),
        eq(shops.ownerId, user.id)
    ]

    if (status) {
        conditions.push(
            eq(appointments.status, status)
        )
    }

    if (search) {
        conditions.push(
            ilike(appointments.customerName, `${search}`)
        )
    }

    const orderBy = sort === 'asc' ? asc(appointments.startAt) : desc(appointments.startAt)

    const [data, totalResult] = await Promise.all([
        db.select({
            ...getTableColumns(appointments)
        })
            .from(appointments)
            .innerJoin(shops,
                eq(appointments.shopId, shops.id)
            )
            .where(and(...conditions))
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset),
        db.select({ total: count() })
            .from(appointments)
            .innerJoin(
                shops,
                eq(appointments.shopId, shops.id)
            )
            .where(and(...conditions))
    ]);

    const total = totalResult[0].total;
    return c.json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1
        }
    }, 200)
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
    const data = c.req.valid('json');

    const appointment = await changeAppointmentStatus({
        id,
        ownerId: user.id,
        status: data.status
    })

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