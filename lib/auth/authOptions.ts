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
    ],
    callbacks: {
      async signIn({ user, account, profile, email }) {
        try {
          if (account?.provider === "google") {
            try {
              console.log("Attempting Google sign in for email:", user.email);
              const existingUser = await db.query.users.findFirst({
                where: eq(users.email, user.email!)
              })
  
              if (existingUser) {
                console.log("Existing user found:", existingUser);
                // Si el usuario existe, actualiza sus datos
                await db.update(users)
                  .set({ 
                    authProvider: 'google',
                    name: user.name || existingUser.name,
                    image: user.image || existingUser.image
                  })
                  .where(eq(users.id, existingUser.id))
                
                // Actualiza el ID del usuario para que coincida con el existente
                user.id = existingUser.id;
              } else {
                console.log("Creating new user for email:", user.email);
                // Crear nuevo usuario si no existe
                const newUser = await db.insert(users).values({
                  email: user.email!,
                  name: user.name,
                  image: user.image,
                  authProvider: 'google',
                }).returning();
                user.id = newUser[0].id;
              }
  
              // Actualizar o insertar la cuenta de Google
              if (account.access_token && account.refresh_token) {
                console.log("Updating or inserting Google account for user ID:", user.id);
                await db.insert(accounts).values({
                  userId: user.id,
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
              console.log("Google sign in successful for email:", user.email);
              return true
            } catch (error) {
              console.error("Error during Google sign in:", error);
              return false;
            }
          }
          return true;
        } catch (error: unknown) {
          console.error("Error during sign in:", error);
          if (error instanceof Error && error.message === "OAuthAccountNotLinked") {
            return '/auth/error?error=OAuthAccountNotLinked';
          }
          return false;
        }
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
      async signOut({ token, session }) {
        try {
          // No revocar el token de Google ya que queremos mantener el acceso
          // Solo limpiar la sesión actual
          await db
            .update(accounts)
            .set({ 
              access_token: null,  // Solo limpiamos el access_token
              expires_at: null     // y su fecha de expiración
              // Mantenemos el refresh_token
            })
            .where(eq(accounts.userId, session?.user?.id));
        } catch (error) {
          console.error('Error during signOut:', error);
        }
      },
    },
    pages: {
      signOut: '/', // Redirige a la página principal después del cierre de sesión
    },
  };
