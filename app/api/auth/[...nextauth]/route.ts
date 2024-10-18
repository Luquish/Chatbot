// Este archivo configura las rutas de autenticación para NextAuth

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions"; // Importa las opciones de autenticación

// Crea el manejador de autenticación con las opciones configuradas
const handler = NextAuth(authOptions);

// Exporta los manejadores para las rutas GET y POST de NextAuth
export { handler as GET, handler as POST };
