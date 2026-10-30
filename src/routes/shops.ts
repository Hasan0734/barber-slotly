import { Hono } from "hono";
import { validate } from "../lib/validate.js";
import { z } from 'zod';
import { authGuard } from "../middleware/auth-guard.js";
import db from "../db/index.js";
import { shops } from "../db/schema/shop.js";

const shopSchema = z.object({
    name: z.string().min(5).max(120),
    description: z.string(),
    slug: z.string().min(5).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        error: "Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen"
    }),
    address: z.string(),
    phone: z.string().max(20),
    timezone: z.string().min(5).max(20)
})

const app = new Hono();


app.get('/', async (c) => {
    try {
        const res = await db.select().from(shops);

        return c.json({ data: res }, 200)

    } catch (err) {
        console.error((err as Error).message)
    }
})

app.post('/', authGuard, validate('json', shopSchema), async (c) => {
    const { name, description, slug, address, phone, timezone } = c.req.valid('json')
    const user = c.get("user");

    try {
        await db.insert(shops).values({ ownerId: user.id, name, description, slug, address, phone, timezone })

        return c.json({ message: "Shop successfully created" }, 201)
    } catch (error: unknown) {
        console.error((error as Error).message)
    }

})

export default app;