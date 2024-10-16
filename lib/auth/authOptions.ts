// lib/authOptions.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema/schemas";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { CustomDrizzleAdapter } from "@/lib/auth/customDrizzleAdapter";

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

        const passwordMatch = await bcrypt.compare(credentials.password, user[0].password || "");
        if (!passwordMatch) {
          return null;
        }

        return user[0];
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Tu lógica de signIn
      return true;
    },
    async redirect({ url, baseUrl }) {
      return '/chat';
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
      return session;
    },
  },
  events: {
    async signOut({ token, session }) {
      if (token.provider === "google") {
        const url = `https://accounts.google.com/o/oauth2/revoke?token=${token.accessToken}`;
        await fetch(url, { method: "POST" });
      }
    },
  },
  pages: {
    signOut: '/', // Redirige a la página principal después del cierre de sesión
  },
};
