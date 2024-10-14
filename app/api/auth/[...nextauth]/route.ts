// app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import { accounts, users } from "@/lib/db/schema/schemas"
import { eq, and } from "drizzle-orm"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { CustomDrizzleAdapter } from "@/lib/customDrizzleAdapter"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: {
      id: string;
    } & DefaultSession["user"]
    accessToken?: string;
    refreshToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: CustomDrizzleAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          scope: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/spreadsheets.readonly"
          ].join(' '),
          response_type: "code"
        }
      }
    }),
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      name: { label: "Name", type: "text" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.name) {
          return null;
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .execute();
        
        if (user.length === 0) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user[0].password || "" );
        if (!passwordMatch) {
          return null;
        }

        return user[0];
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
        if (account?.provider === "google") {
          try {
            const existingUser = await db.query.users.findFirst({
              where: eq(users.email, user.email!)
            })
  
            if (existingUser) {
              // Si el usuario existe pero no está vinculado a Google
              if (existingUser.authProvider !== 'google') {
                // Actualizar el usuario existente para vincularlo a Google
                await db.update(users)
                  .set({ 
                    authProvider: 'google',
                    name: user.name || existingUser.name,
                    image: user.image || existingUser.image
                  })
                  .where(eq(users.id, existingUser.id))
                
                // Eliminar cualquier cuenta local existente
                await db.delete(accounts)
                  .where(and(
                    eq(accounts.userId, existingUser.id),
                    eq(accounts.provider, 'credentials')
                  ))
              }
            } else {
              // Crear nuevo usuario si no existe
              await db.insert(users).values({
                id: user.id,
                email: user.email!,
                name: user.name,
                image: user.image,
                authProvider: 'google',
              })
            }
  
            // Actualizar o insertar la cuenta de Google
            if (account.access_token && account.refresh_token) {
              await db.insert(accounts).values({
                userId: existingUser ? existingUser.id : user.id!,
                type: account.type,
                provider: account.provider!,
                providerAccountId: account.providerAccountId!,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              }).onConflictDoUpdate({
                target: [accounts.provider, accounts.providerAccountId],
                set: {
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                }
              });
            }
            return true
          } catch (error) {
            console.error("Error during Google sign in:", error);
            return false;
          }
        }
        return true;
      },
    
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      return '/chat'
    },
    
    async jwt({ token, account, trigger }) {
        if (trigger === "signIn" && account) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.provider = account.provider;
        }
        return token;
    },
    
    async session({ session, token }) {
        if (session.user) {
            session.user.id = token.sub as string;
            session.accessToken = token.accessToken as string;
            session.refreshToken = token.refreshToken as string;
        }
        return session
      },   
  },
  events: {
    async signOut({ token }) {
      if (token.provider === "google") {
        const url = `https://accounts.google.com/o/oauth2/revoke?token=${token.accessToken}`;
        await fetch(url, { method: "POST" });
      }
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }