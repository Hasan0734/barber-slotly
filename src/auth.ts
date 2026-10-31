import { betterAuth } from 'better-auth'
import { env } from './env.js'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import db from './db/index.js'
import * as schema from './db/schema/auth.js'
import { admin } from 'better-auth/plugins'

export const auth = betterAuth({
    emailAndPassword: {
        enabled: true
    },

    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: schema
    }),

    plugins: [
        admin({
            defaultRole: "user",
            adminRoles: ["admin"]
        })
    ]
})