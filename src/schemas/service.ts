import { z } from 'zod';

export const createServiceSchema = z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().max(1000).optional(),
    price: z.number().int().min(0),
    duration: z.number().int().min(5).max(400)
})

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;