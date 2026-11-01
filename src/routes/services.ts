import { Hono } from "hono";
import db from "../db/index.js";
import { eq, and, getTableColumns } from "drizzle-orm";
import { validate } from "../lib/validate.js";
import {
    createServiceSchema,
    updateServiceSchema,
    updateServiceStatusSchema
} from "../schemas/service.js";
import { services } from "../db/schema/services.js";
import { shops } from "../db/schema/shops.js";
import { authGuard } from "../middleware/auth-guard.js";
import { HTTPException } from "hono/http-exception";

const app = new Hono();


// create service
app.post('/', authGuard, validate('json', createServiceSchema), async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    const [shop] = await db.select()
        .from(shops)
        .where(
            eq(shops.ownerId, user.id)
        ).limit(1);

    if (!shop) {
        throw new HTTPException(404, { message: "You don't have any shop" })
    }
    await db.insert(services)
        .values({ shopId: shop.id, ...data });

    return c.json({
        success: true,
        message: "Service created successfully"
    }, 201);

})

// get all services
app.get('/', authGuard, async (c) => {
    const user = c.get('user');

    const shopServices = await db.select({ ...getTableColumns(services) })
        .from(services)
        .innerJoin(shops, eq(services.shopId, shops.id))
        .where(eq(shops.ownerId, user.id));

    return c.json({
        success: true,
        data: shopServices
    }, 200)

})

// get service by id
app.get('/:id', authGuard, async (c) => {
    const id = c.req.param('id')
    const user = c.get('user');

    const [service] = await db.select({ ...getTableColumns(services) })
        .from(services)
        .innerJoin(shops, eq(services.shopId, shops.id))
        .where(
            and(
                eq(services.id, id),
                eq(services.shopId, shops.id),
                eq(shops.ownerId, user.id)
            )
        );

    if (!service) {
        throw new HTTPException(404, { message: "Service not found" })
    }

    return c.json({
        success: true,
        data: service
    }, 200)


})

// service updage by id
app.patch('/:id', authGuard, validate('json', updateServiceSchema), async (c) => {
    const body = c.req.valid('json');
    const id = c.req.param('id')
    const user = c.get('user');

    const res = await db.update(services)
        .set(body)
        .from(shops)
        .where(
            and(
                eq(services.id, id),
                eq(services.shopId, shops.id),
                eq(shops.ownerId, user.id)
            )
        );

    if (!res.rowCount) {
        throw new HTTPException(404, { message: "Service not found" })
    }

    return c.json({ message: "Service successfully updated", success: true }, 201)

})


// service status changed by id
app.patch('/:id/status', authGuard, validate('json', updateServiceStatusSchema), async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = c.req.valid('json')

    const res = await db.update(services).set(body)
        .from(shops)
        .where(
            and(
                eq(services.id, id),
                eq(services.shopId, shops.id),
                eq(shops.ownerId, user.id)
            )
        )

    if (!res.rowCount) {
        throw new HTTPException(404, { message: "Service not found" })
    }
    return c.json({
        success: true,
        message: "Service status changed",

    })
})


// delete service by id
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

    return c.json({
        success: true,
        message: "Service deleted successfully",
    }, 200)
})


export default app;