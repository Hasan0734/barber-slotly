import * as z from 'zod';
import { slugify } from '../lib/utils.js';


const baseShopSchema = z.object({
    name: z.string().min(5).max(120),
    description: z.string(),
    slug: z.string().min(5).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        error: "Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen"
    }).optional(),
    address: z.string(),
    phone: z.string().max(20),
    timezone: z.string().min(5).max(20)
})

export const shopSchema = baseShopSchema.transform((data) => {
    if (!data.slug) {
        data.slug = slugify(data.name);
    }
    return data as Required<typeof data>;
})
export const updateShopSchema = baseShopSchema.partial();

export type CreateShopInput = z.infer<typeof shopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
