// app/api/feedback/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema/feedback';

interface FeedbackRequest {
  prompt: string;
  response: string;
  isPositive: boolean;
}

export async function POST(request: Request) {
  try {
    const { prompt, response, isPositive } = (await request.json()) as FeedbackRequest;

    // Validar los datos
    if (!prompt || !response || typeof isPositive !== 'boolean') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // Insertar el feedback en la base de datos
    await db.insert(feedback).values({
      prompt,
      response,
      is_positive: isPositive,
    });

    return NextResponse.json({ message: 'Feedback recibido' }, { status: 200 });
  } catch (error) {
    console.error('Error al procesar el feedback:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
