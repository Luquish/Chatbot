import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env.mjs';
import { feedback } from './schema/feedback'; // Importa el esquema de feedback

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, {
  schema: {
    feedback, // Agrega el esquema de feedback
    // ... otros esquemas si los tienes
  },
});
