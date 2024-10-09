// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema/schemas"
import { eq } from "drizzle-orm"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
                email: user.email!,
                name: user.name,
                image: user.image,
                authProvider: 'google',
                // No se establece contraseña para usuarios de Google
              })
            } else if (existingUser.authProvider !== 'google') {
              // Actualizar usuario existente si se registró previamente con otro método
              await db.update(users)
                .set({ authProvider: 'google' })
                .where(eq(users.email, user.email!))
            }
          }
          return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.email = token.email
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      return '/chat'
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    }   
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }