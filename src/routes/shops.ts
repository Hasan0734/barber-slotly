import { Hono } from "hono";
import { validate } from "../lib/validate.js";
import { authGuard } from "../middleware/auth-guard.js";
import db from "../db/index.js";
import { shops } from "../db/schema/shops.js";
import { eq, or } from "drizzle-orm";
import { shopSchema, updateShopSchema } from "../schemas/shop.js";
import { HTTPException } from "hono/http-exception";
import { createAppointmentSchema } from "../schemas/appointment.js";
import { availabilityQuerySchema } from "../schemas/availability.js";
import { getAvailableSlots } from "../services/availability.js";
import { createAppointment } from "../services/appointment.js";
import { resolveCustomerSession } from "../middleware/resolve-customer-session.js";

const app = new Hono();


// shop lists
app.get('/', async (c) => {
    const res = await db.select().from(shops).limit(10);
    return c.json({ data: res, success: true }, 200);
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
app.post('/:slug/appointments', resolveCustomerSession, validate('json', createAppointmentSchema), async (c) => {

    const body = c.req.valid('json');
    const shopSlug = c.req.param('slug');
    const customer = c.get('customer');

    const ownership =
        customer.type === "registered"
            ? {
                customerId: customer.customerId,
                guestSessionId: null,
            }
            : {
                customerId: null,
                guestSessionId: customer.guestSessionId,
            };

    const appointment = await createAppointment({
        ...body,
        shopSlug,
        ...ownership
    });


    const { bookingToken, ...rest } = appointment;
    return c.json({
        success: true,
        message: "Appointment created successfully",
        data: rest,
    }, 201);
})


// check avaibility
app.get("/:slug/availability", validate('query', availabilityQuerySchema), async (c) => {

    const { serviceId, date } = c.req.valid('query');
    const slug = c.req.param('slug');

    const slots = await getAvailableSlots({
        slug, serviceId, date
    })

    return c.json({
        success: true,
        data: {
            date,
            avialableSlots: slots
        }
    })
})

// get shop by slug
app.get('/:slug', async (c) => {
    const slug = c.req.param("slug")
    const [shop] = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);
    if (!shop) {
        throw new HTTPException(404, { message: "Shop not found" })
    }
    return c.json({ data: shop, success: true }, 200)

})


export default app;