import { Hono } from "hono";
import { validate } from "../lib/validate.js";
import { authGuard } from "../middleware/auth-guard.js";
import db from "../db/index.js";
import { shops } from "../db/schema/shops.js";
import { and, eq, or } from "drizzle-orm";
import { shopSchema, updateShopSchema } from "../schemas/shop.js";
import { HTTPException } from "hono/http-exception";
import { createAppointmentSchema } from "../schemas/appointment.js";
import { appointments } from "../db/schema/appointments.js";
import { services } from "../db/schema/services.js";

const app = new Hono();


// shop lists
app.get('/', async (c) => {
    const res = await db.select().from(shops).limit(10);
    return c.json({ data: res, success: true }, 200)


})

app.post('/', authGuard, validate('json', shopSchema), async (c) => {

    const data = c.req.valid('json');
    const user = c.get("user");
    const existingRecords = await db.select().from(shops).where(
        or(
            eq(shops.slug, data.slug),
            eq(shops.ownerId, user.id)
        )
    );

    if (existingRecords.length > 0) {
        const hasSameOwner = existingRecords.some(shop => shop.ownerId === user.id);
        if (hasSameOwner) {
            throw new HTTPException(409, { message: "You have already created shop" })
        }

        const hasSameSlug = existingRecords.some(shop => shop.slug === data.slug);
        if (hasSameSlug) {
            throw new HTTPException(400, { message: `This slug ${data.slug} is already taken` })
        }
    }

    await db.insert(shops).values({ ownerId: user.id, ...data });
    return c.json({ message: "Shop successfully created", success: true }, 201)

});

// get shop profile by owner
app.get('/me', authGuard, async (c) => {
    const user = c.get('user')
    const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id)).limit(1);
    if (!shop) {
        throw new HTTPException(404, { message: "You don't have any shop" })
    }
    return c.json({ data: shop, success: true }, 200)
});

// update shop by owner 
app.patch('/me', authGuard, validate('json', updateShopSchema), async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');

    const res = await db.update(shops).set(body).where(eq(shops.ownerId, user.id));
    if (!res.rowCount) {
        throw new HTTPException(404, { message: "You don't have any shop" })
    }
    return c.json({ message: "Shop successfully updated.", success: true }, 201)
})

// delete shp by owner
app.delete('/me', authGuard, async (c) => {
    const user = c.get("user")
    const res = await db.delete(shops).where(eq(shops.ownerId, user.id));

    if (!res.rowCount) {
        throw new HTTPException(404, { message: "You don't have any shop" })
    }
    return c.json({ message: "Shop deleted successfully ", success: true }, 200)
})

// create appointments
app.post('/:slug/appointments', validate('json', createAppointmentSchema), async (c) => {

    const body = c.req.valid('json');
    const shopSlug = c.req.param('slug');

    // 1. Find shop
    const [shop] = await db.select()
        .from(shops)
        .where(
            eq(shops.slug, shopSlug)
        ).limit(1);

    if (!shop) {
        throw new HTTPException(404, { message: "Shop not found" })
    }

    // 2. Find service belonging to this shop
    const [service] = await db.select().from(services)
        .where(
            and(
                eq(services.id, body.serviceId),
                eq(services.shopId, shop.id),
                eq(services.isActive, true)
            )
        );

    if (!service) {
        throw new HTTPException(404, { message: "Service not found or unavailable" })
    }

    // 3. Convert actual date startAt and canculate endAt
    const startAt = new Date(body.startAt);

    if (startAt <= new Date()) {
        throw new HTTPException(400, { message: "Appointment must be in the future" })
    }
    const endAt = new Date(
        startAt.getTime() + (service.durationMinutes * 60 * 1000)
    )

    // 4. Prepare appointment data
    const data = {
        shopId: shop.id,
        serviceId: service.id,

        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail ?? null,
        customerNote: body.customerNote ?? null,

        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.durationMinutes,

        startAt,
        endAt
    };

    // 6. Create appointment
    const [appointment] = await db.insert(appointments)
        .values(data)
        .returning();

    return c.json({
        success: true,
        message: "Appointment created successfully",
        data: {
            ...appointment,
            shopName: shop.name,
            shopPhone: shop.phone,
            shopAddress: shop.address
        }
    }, 201)
})

// get shop by slug
app.get('/:slug', async (c) => {
    const slug = c.req.param("slug")
    const [shop] = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);
    return c.json({ data: shop, success: true }, 200)

})


export default app;