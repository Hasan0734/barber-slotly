import { z } from 'zod';

const envSchema = z.object({
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(16),
    DATABASE_URL: z.string().startsWith('postgresql://'),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    APP_URL: z.url()
})

export const env = envSchema.parse(process.env)