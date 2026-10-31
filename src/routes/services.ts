import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { validate } from "../lib/validate.js";
import { createServiceSchema, updateServiceSchema } from "../schemas/service.js";
import db from "../db/index.js";
import { services } from "../db/schema/services.js";
import { shops } from "../db/schema/shops.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";
import * as z from 'zod';

const app = new Hono();


const selectedProperty = {
    id: services.id,
    shopId: services.shopId,
    name: services.name,
    description: services.description,
    price: services.price,
    duration: services.duration,
    isActive: services.isActive,
    createdAt: services.createdAt,
    updatedAt: services.updatedAt
}


app.post('/', authGuard, validate('json', createServiceSchema), async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id)).limit(1)

    if (!shop) {
        throw new HTTPException(404, { message: "You don't have any shop" })
    }
    await db.insert(services).values({ shopId: shop.id, ...data })
    return c.json({ message: "Service created successfully", success: true }, 201);

})

app.get('/', authGuard, async (c) => {
    const user = c.get('user');

    const shopServices = await db.select(selectedProperty)
        .from(services)
        .innerJoin(shops, eq(services.shopId, shops.id))
        .where(eq(shops.ownerId, user.id));

    return c.json({ data: shopServices, success: true }, 200)

})

app.get('/:id', authGuard, async (c) => {
    const id = c.req.param('id')
    const user = c.get('user');

    const [service] = await db.select(selectedProperty).from(services)
        .innerJoin(shops, eq(services.shopId, shops.id))
        .where(and(eq(services.id, id), eq(shops.ownerId, user.id)));

    if (!service) {
        throw new HTTPException(404, { message: "Service not found" })
    }

    return c.json({ data: service, success: true }, 200)


})

app.patch('/:id', authGuard, validate('json', updateServiceSchema), async (c) => {
    const body = c.req.valid('json');
    const id = c.req.param('id')
    const user = c.get('user');

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, user.id)).limit(1);
    if (!shop) {
        throw new HTTPException(404, { message: "You don't have any shop" })
    }

    const res = await db.update(services)
        .set(body)
        .where(
            and(
                eq(services.id, id),
                eq(services.shopId, shop.id)
            )
        );

    if (!res.rowCount) {
        throw new HTTPException(404, { message: "Service not found" })
    }

    return c.json({ message: "Service successfully updated", success: true }, 201)

})

app.patch('/:id/status', authGuard, async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    const parsed = z.object({
        isActive: z.boolean()
    }).safeParse(body);

    if (!parsed.success) {
        throw new HTTPException(400, {
            message: "Invalid status value"
        })
    }

    const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id));
    if (!shop) {
        throw new HTTPException(404, {
            message: "Shop not found for this service"
        })
    }

    const res = await db.update(services).set({
        isActive: parsed.data.isActive,
        updatedAt: new Date()
    }).where(
        and(
            eq(services.id, id),
            eq(services.shopId, shop.id)
        )
    )

    if (!res.rowCount) {
        throw new HTTPException(404, { message: "Service not found" })
    }
    return c.json({
        success: true,
        message: "Service status updated successfully",

    })
})

app.delete('/:id', authGuard, async (c) => {
    const user = c.get('user');
    const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id));
    if (!shop) {
        throw new HTTPException(404, {
            message: "Shop not found for this service"
        })
    }
    const res = await db.delete(services).where(eq(services.shopId, shop.id));

    if (!res.rowCount) {
        throw new HTTPException(404, {
            message: "Service not found"
        })
    }

    return c.json({ message: "Service deleted successfully", success: true }, 200)
})


export default app;