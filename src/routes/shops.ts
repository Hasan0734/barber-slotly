import { Hono } from "hono";
import { validate } from "../lib/validate.js";
import { set, z } from 'zod';
import { authGuard } from "../middleware/auth-guard.js";
import db from "../db/index.js";
import { shops } from "../db/schema/shop.js";
import { eq, or } from "drizzle-orm";
import { slugify } from "../lib/utils.js";


const shopSchema = z.object({
    name: z.string().min(5).max(120),
    description: z.string(),
    slug: z.string().min(5).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        error: "Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen"
    }).optional(),
    address: z.string(),
    phone: z.string().max(20),
    timezone: z.string().min(5).max(20)
}).transform((data) => {
    if (!data.slug) {
        data.slug = slugify(data.name);
    }
    return data as Required<typeof data>;
})

const app = new Hono();


app.get('/', async (c) => {
    try {
        const res = await db.select().from(shops).limit(10);
        return c.json({ data: res }, 200)

    } catch (err) {
        console.error((err as Error).message)
    }
})

app.post('/', authGuard, validate('json', shopSchema), async (c) => {

    try {
        const { name, description, slug, address, phone, timezone } = c.req.valid('json');
        const user = c.get("user");

        const existingRecords = await db.select().from(shops).where(
            or(
                eq(shops.slug, slug),
                eq(shops.ownerId, user.id)
            )
        );

        if (existingRecords.length > 0) {
            const hasSameOwner = existingRecords.some(shop => shop.ownerId === user.id);
            if (hasSameOwner) {
                return c.json({ message: "You have already created shop" }, 409);
            }

            const hasSameSlug = existingRecords.some(shop => shop.slug === slug);
            if (hasSameSlug) {
                return c.json({ message: `This slug ${slug} is already taken` }, 400)
            }
        }

        await db.insert(shops).values({ ownerId: user.id, name, description, slug, address, phone, timezone });


        return c.json({ message: "Shop successfully created" }, 201)
    } catch (error: unknown) {
        console.error((error as Error).message)
    }
});

app.get('/me', authGuard, async (c) => {
    try {
        const user = c.get('user')
        const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id)).limit(1);

        if (!shop) {
            return c.json({ message: `Shop not found. Create shop first.`, success: false }, 404);
        }

        return c.json(shop, 200)
    } catch (err) {
        console.error((err as Error).message)
    }
});

app.patch('/me', authGuard, validate('json', shopSchema), async (c) => {
    try {
        const body = c.req.valid('json');
        const user = c.get('user');
        const [shop] = await db.select().from(shops).where(eq(shops.ownerId, user.id)).limit(1);

        if (!shop) {
            return c.json({ message: `Shop not found. Create shop first.`, success: false }, 404)
        }

        await db.update(shops).set(body).where(eq(shops.ownerId, user.id));
        return c.json({ message: "Shop successfully updated.", success: true }, 201)
    } catch (err) {
        console.error((err as Error).message)
    }
})

app.get('/:slug', async (c) => {
    try {
        const slug = c.req.param("slug")
        const [shop] = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);

        return c.json(shop, 200)
    } catch (err) {
        console.error((err as Error).message)
    }
})


app.post()

export default app;