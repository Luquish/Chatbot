// app/api/auth/register/route.ts

import { NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/schemas";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
    const { email, name, password } = await request.json();
  
    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
  
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .execute();
  
      if (existingUser.length > 0) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }
  
      // Importación dinámica de bcrypt
      const bcrypt = await import('bcrypt');
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create new user
      const newUser = await db.insert(users).values({
        email,
        name,
        password: hashedPassword,
      }).returning().execute();
  
      return NextResponse.json({ message: "User registered successfully", user: newUser[0], redirect: '/chat' }, { status: 201 });
    } catch (error) {
      console.error('Error registering user:', error);
      return NextResponse.json({ error: "An error occurred while registering the user" }, { status: 500 });
    }
  }