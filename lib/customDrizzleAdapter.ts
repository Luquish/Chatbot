import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { users, accounts } from "@/lib/db/schema/schemas"
import { eq, and } from "drizzle-orm"
import { AdapterUser, AdapterAccount } from "next-auth/adapters"

export function CustomDrizzleAdapter(db: any) {
  return {
    ...DrizzleAdapter(db),
    getUserByEmail: async (email: string) => {
      const dbUser = await db.select().from(users).where(eq(users.email, email)).execute()
      return dbUser.length > 0 ? dbUser[0] : null
    },
    getUserByAccount: async ({ providerAccountId, provider }: { providerAccountId: string, provider: string }) => {
      const dbAccount = await db.select()
        .from(accounts)
        .innerJoin(users, eq(accounts.userId, users.id))
        .where(and(
          eq(accounts.providerAccountId, providerAccountId),
          eq(accounts.provider, provider)
        ))
        .execute()
      return dbAccount.length > 0 ? dbAccount[0].user : null
    },
    updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, "id">) => {
      const { id, ...userData } = user
      await db.update(users).set(userData).where(eq(users.id, id)).execute()
      const updatedUser = await db.select().from(users).where(eq(users.id, id)).execute()
      return updatedUser.length > 0 ? updatedUser[0] : null
    },
    linkAccount: async (account: AdapterAccount) => {
      await db.insert(accounts).values(account).execute()
    },
  }
}