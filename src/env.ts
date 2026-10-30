import { z } from 'zod';

const envSchema = z.object({
    BETTER_AUTH_URL: z.string().startsWith('http'),
    BETTER_AUTH_SECRET: z.string().min(16),
    DATABASE_URL: z.string().startsWith('postgresql://')

})

export const env = envSchema.parse(process.env)