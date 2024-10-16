import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema/schemas';
import { eq } from 'drizzle-orm';

export async function saveRefreshToken(userId: string, refreshToken: string) {
  await db
    .update(accounts)
    .set({ refresh_token: refreshToken })
    .where(eq(accounts.userId, userId))
    .execute();
}
