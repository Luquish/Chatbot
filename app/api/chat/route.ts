// app/api/chat/route.ts

import { createResource } from '../../../lib/actions/resources';
import { createOpenAI as createGroq } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '../../../lib/ai/embedding';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/schemas';
import { eq } from 'drizzle-orm';

// Initialize the groq model
const groq = createGroq({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // Obtener el nombre del usuario desde la base de datos
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).execute();

  const userName = user[0]?.name || 'Usuario';
  const { messages } = await req.json();

  // Verificar si el último mensaje es un trigger proactivo
  const lastMessage = messages[messages.length - 1];
  let proactivePrompt = '';
  let messagesToSend = messages;

  if (lastMessage.role === 'user' && lastMessage.content.startsWith('__PROACTIVE_TRIGGER__')) {
    proactivePrompt = lastMessage.content.replace('__PROACTIVE_TRIGGER__', '');
    // Excluir el último mensaje (trigger proactivo) de los mensajes a enviar
    messagesToSend = messages.slice(0, -1);
  }

  console.log('Received messages:', messagesToSend);
  console.log('Proactive prompt:', proactivePrompt);

  const result = await streamText({
    model: groq('llama-3.1-70b-versatile'),
    
    messages: convertToCoreMessages(messagesToSend),

    system: `Eres un asistente útil de profesionalización y embajador de la cultura de la empresa llamado Onwy. Estás hablando con ${userName} (Dile solo por el nombre). Recuérdalo siempre y avísale a los usuarios cuando comiencen a usarlo.

    Inicia la conversación de manera proactiva con un mensaje relacionado a: "${proactivePrompt}". No menciones que esto es un mensaje proactivo, simplemente inicia la conversación de forma natural.

    Cuando el usuario solicite crear un evento en el calendario, sigue estos pasos:

    1. Pide amablemente los siguientes datos:
        - Título del evento
        - Descripción del evento
        - Ubicación del evento
        - Fecha y hora de inicio (en cualquier formato que el usuario prefiera, por ejemplo: "mañana a las 2 de la tarde" o "15 de mayo a las 14:00", pero siempre que aclare el dia y el mes)
        - Fecha y hora de finalización (en el mismo formato que el inicio)
        - Correos electrónicos de los asistentes (si los hay)
        - ID del calendario (si el usuario lo conoce, de lo contrario usa el calendario predeterminado)
        - Tipo de evento (si es relevante)

    2. Asegúrate de obtener todos estos datos antes de crear el evento. Si el usuario no proporciona alguno de estos datos, pregúntale específicamente por esa información faltante.

    3. Una vez que tengas todos los datos necesarios, utiliza la herramienta createCalendarEvent para crear el evento.

    4. Después de crear el evento, confirma al usuario que el evento ha sido creado exitosamente y proporciona un resumen de los detalles del evento.

    Recuerda ser siempre amable y profesional en tus interacciones.`,

    tools: {
        addResource: tool({
          description: `add a resource to your knowledge base.
            If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
          parameters: z.object({
            content: z
              .string()
              .describe('the content or resource to add to the knowledge base'),
          }),
          execute: async ({ content }) => createResource({ content }),
        }),
        getInformation: tool({
          description: `get information from your knowledge base to answer questions.`,
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => findRelevantContent(question),
        }),
        createCalendarEvent: tool({
            description: `create a calendar event for the user`,
            parameters: z.object({
              summary: z.string().describe('the title of the event'),
              description: z.string().describe('the description of the event'),
              location: z.string().describe('the location of the event'),
              startDateTime: z.string().describe('the start date and time of the event'),
              endDateTime: z.string().describe('the end date and time of the event'),
              attendeesEmails: z.array(z.string()).describe('the emails of the attendees'),
              calendarId: z.string().describe('the id of the calendar'),
              eventType: z.string().describe('the type of the event'),
            }),
            execute: async ({ summary, description, location, startDateTime, endDateTime, attendeesEmails, calendarId, eventType }) => {
              // Importa la función createEvent aquí para evitar problemas de circular dependency
              const { createEvent } = await import('@/lib/ai/googleCalendar');
              return createEvent({ summary, description, location, startDateTime, endDateTime, userId, attendeesEmails, calendarId, eventType });
            },
          }),
    },
 });

    return result.toDataStreamResponse();
}
