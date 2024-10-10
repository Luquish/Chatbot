// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import { accounts, users } from "@/lib/db/schema/schemas"
import { eq } from "drizzle-orm"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { DefaultSession } from "next-auth"
import { CustomDrizzleAdapter } from "@/lib/customDrizzleAdapter"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: {
      id: string;
    } & DefaultSession["user"]
  }
}

const authOptions: NextAuthOptions = {
  adapter: CustomDrizzleAdapter(db),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          scope: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
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
    async signIn({ user, account }) {
        if (account?.provider === "google") {
            const existingUser = await db.query.users.findFirst({
              where: eq(users.email, user.email!)
            })
    
            if (!existingUser) {
              // Crear nuevo usuario
              await db.insert(users).values({
                id: user.id,
                email: user.email!,
                name: user.name,
                image: user.image,
                authProvider: 'google',
                // No se establece contraseña para usuarios de Google
              })
            } 
            else if (existingUser.authProvider !== 'google') {
              // Actualizar usuario existente si se registró previamente con otro método
              await db.update(users)
                .set({ authProvider: 'google' })
                .where(eq(users.email, user.email!))
            }
            // Actualizar el nombre del usuario si ha cambiado en Google
            if (existingUser && user.name && existingUser.name !== user.name) {
                await db.update(users)
                .set({ name: user.name })
                .where(eq(users.id, existingUser.id))
            }

          }
          if (account?.provider === "google" && account.access_token && account.refresh_token) {
            await db.insert(accounts).values({
              userId: user.id!,
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
    },
    
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      return '/chat'
    },async jwt({ token, user, account }) {
        if (user) {
          token.id = user.id
        }
        if (account) {
          token.accessToken = account.access_token
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string
        }
        return session
      },   
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }