// lib/db/index.ts  

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env.mjs';
import { feedback } from './schema/feedback';
import { users, accounts} from './schema/schemas';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, {
  schema: {
    feedback,
    users,
    accounts,
  },
});
