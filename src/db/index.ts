
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../env.js';

const db = drizzle({
    connection: {
        connectionString: env.DATABASE_URL,
    }
});

export default db;