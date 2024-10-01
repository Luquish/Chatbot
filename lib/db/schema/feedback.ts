import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  is_positive: boolean('is_positive').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});