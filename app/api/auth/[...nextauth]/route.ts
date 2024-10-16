// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions"; // Ajusta la ruta según corresponda

const handler = NextAuth(authOptions);

// Exporta únicamente los manejadores de rutas
export { handler as GET, handler as POST };
