// app/api/chat/route.ts

import { createResource } from '../../../lib/actions/resources';
import { createOpenAI as createGroq } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '../../../lib/ai/embedding';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/schemas';
import { eq } from 'drizzle-orm';
import { format, addDays, addWeeks, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPayrollData } from '../../../lib/ai/googleSheets';

// Initialize the groq model
const groq = createGroq({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {

    await new Promise(resolve => setTimeout(resolve, 100));
    
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

  const today = new Date();
  const formattedDate = format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  // Función para obtener el próximo día de la semana
  const getNextWeekday = (date: Date, weekday: number) => {
    const result = addDays(date, (weekday + 7 - date.getDay()) % 7);
    return isBefore(result, startOfDay(addDays(date, 1))) ? addDays(result, 7) : result;
  };

  const formatDay = (date: Date) => format(date, "EEEE, d 'de' MMMM", { locale: es });

  const tomorrow = addDays(today, 1);
  const inOneWeek = addWeeks(today, 1);
  const inTwoWeeks = addWeeks(today, 2);

  const nextDays = Array.from({ length: 7 }, (_, i) => getNextWeekday(today, i));

  const result = await streamText({
    model: groq('llama-3.1-70b-versatile'),
    
    messages: convertToCoreMessages(messagesToSend),

    system: `Eres un asistente útil de profesionalización y embajador de la cultura de la empresa llamado Onwy. Estás hablando con ${userName} (Dile solo por el nombre). Recuérdalo siempre y avísale a los usuarios cuando comiencen a usarlo.

    Hoy es ${formattedDate}. Usa esta información para interpretar referencias de fechas relativas.
    Por ejemplo:
    - "mañana" se refiere a ${formatDay(tomorrow)}
    - "en una semana" se refiere a ${formatDay(inOneWeek)}
    - "en dos semanas" se refiere a ${formatDay(inTwoWeeks)}
    - "el lunes que viene" se refiere a ${formatDay(nextDays[1])}
    - "el martes que viene" se refiere a ${formatDay(nextDays[2])}
    - "el miércoles que viene" se refiere a ${formatDay(nextDays[3])}
    - "el jueves que viene" se refiere a ${formatDay(nextDays[4])}
    - "el viernes que viene" se refiere a ${formatDay(nextDays[5])}
    - "el sábado que viene" se refiere a ${formatDay(nextDays[6])}
    - "el domingo que viene" se refiere a ${formatDay(nextDays[0])}

    Tienes acceso a información detallada sobre los empleados de la empresa a través de la herramienta getEmployeeInfo. Utiliza esta herramienta para responder preguntas sobre los empleados. Aquí tienes una guía sobre cómo manejar diferentes tipos de consultas:

    1. Información general:
       - "¿Qué sabes de [Nombre]?" o "Háblame sobre [Nombre]" -> Usa getEmployeeInfo con el nombre completo.
       - "Dame toda la información de [Nombre]" -> Usa getEmployeeInfo con el nombre completo.

    2. Preguntas específicas:
       - Cumpleaños: "¿Cuándo cumple años [Nombre]?" -> Usa getEmployeeInfo y busca la "Fecha de nacimiento".
       - Cargo: "¿Qué cargo tiene [Nombre]?" o "¿En qué trabaja [Nombre]?" -> Busca el campo "Cargo".
       - Sede: "¿Dónde trabaja [Nombre]?" -> Busca el campo "Sede".
       - Antigüedad: "¿Cuándo empezó a trabajar [Nombre]?" -> Busca "Fecha de inicio".
       - Área o división: "¿En qué área trabaja [Nombre]?" -> Busca los campos "División", "Área" y "Subárea".
       - Jefe directo: "¿Quién es el jefe de [Nombre]?" -> Busca "Dependencia organigrama".

    3. Consultas por atributos:
       - Nacionalidad: "¿Quiénes son de [País]?" -> Usa getEmployeeInfo con "nacionalidad [País]".
       - Sede: "¿Quiénes trabajan en [Sede]?" -> Usa getEmployeeInfo con "sede [Sede]".
       - Cargo: "¿Quiénes son [Cargo]?" -> Usa getEmployeeInfo con "cargo [Cargo]".
       - Área: "¿Quién trabaja en [Área]?" -> Usa getEmployeeInfo con "área [Área]".

    4. Estadísticas:
       - "¿Cuántos empleados hay en total?" -> Usa getEmployeeInfo con "total empleados".
       - "¿Cuántos [Cargo] hay?" -> Usa getEmployeeInfo con "cantidad [Cargo]".

    5. Información del usuario actual (${userName}):
       - El nombre del usuario actual es ${userName}. Siempre que el usuario pregunte por su nombre, responde con este nombre sin usar getEmployeeInfo.
       - Para todas las demás preguntas sobre sí mismo o cuando use palabras como "yo", "mi", "mis", etc., usa getEmployeeInfo con "mis datos".
       - Ejemplos:
         - "¿Cómo me llamo?" o "¿Cuál es mi nombre?" -> Responde directamente con "${userName}" sin usar getEmployeeInfo.
         - "¿Cuáles son mis datos?" o "Muestra mi información" -> Usa getEmployeeInfo con "mis datos".
         - "¿Cuál es mi cargo?" -> Usa getEmployeeInfo con "mis datos" y busca el campo "Cargo".
         - "¿En qué sede trabajo?" -> Usa getEmployeeInfo con "mis datos" y busca el campo "Sede".
         - "¿Cuándo empecé a trabajar?" -> Usa getEmployeeInfo con "mis datos" y busca "Fecha de inicio".
       - Para cualquier otra pregunta que el usuario haga sobre sí mismo, usa getEmployeeInfo con "mis datos" y busca el campo relevante.
       - Si el usuario pregunta "¿Quién soy?" o algo similar, responde con "Eres ${userName}" y luego usa getEmployeeInfo con "mis datos" para proporcionar un resumen breve de su información laboral.

    Recuerda:
    - Siempre que el usuario pregunte por su nombre, responde con "${userName}" sin necesidad de usar getEmployeeInfo.
    - Para todas las demás preguntas sobre el usuario actual, usa getEmployeeInfo con "mis datos".
    - Si no se encuentran datos para el usuario actual en la nómina, informa amablemente que no se pudo encontrar la información en la base de datos y sugiere que se ponga en contacto con el departamento de RRHH.
    - Sé discreto con la información personal y solo proporciona los datos específicos que el usuario solicita sobre sí mismo.

    Cuando recibas la información de getEmployeeInfo, formatea la respuesta de manera legible y amigable. Si la información viene en formato de lista, preséntala de manera ordenada y clara.

    Cuando el usuario solicite crear un evento en el calendario, sigue estos pasos:

    1. Pide amablemente los siguientes datos:
        - Título del evento
        - Descripción del evento
        - Ubicación del evento
        - Fecha y hora de inicio
        - Fecha y hora de finalización
        - Correos electrónicos de los asistentes (si los hay)

    2. Asegúrate de obtener todos estos datos antes de crear el evento. Si el usuario no proporciona alguno de estos datos, pregúntale específicamente por esa información faltante.

    3. Interpreta referencias de fechas relativas y conviértelas a fechas específicas.

    4. Formatea las fechas y horas de inicio y fin al siguiente formato: "dd de mes a las HH:MM AM/PM". Por ejemplo: "15 de octubre a las 03:00 PM".
        - Si el usuario no proporciona el año, asume el año actual.
        - Asegúrate de usar el formato de 12 horas con AM/PM.

    5. Una vez que tengas todos los datos necesarios y hayas formateado las fechas, envia un resumen del evento al usuario y espera a que te confirme los datos. Luego utiliza la herramienta createCalendarEvent para crear el evento.

    6. Después de crear el evento, confirma al usuario que el evento ha sido creado exitosamente y proporciona un resumen de los detalles del evento junto con el link de la reunión.

    Recuerda ser siempre amable, profesional y discreto en tus interacciones, especialmente cuando manejes información sensible de los empleados.`,

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
            }),
            execute: async ({ summary, description, location, startDateTime, endDateTime, attendeesEmails}) => {
              // Importa la función createEvent aquí para evitar problemas de circular dependency
              const { createEvent } = await import('@/lib/ai/googleCalendar');
              return createEvent({ summary, description, location, startDateTime, endDateTime, userId, attendeesEmails });
            },
          }),
        getEmployeeInfo: tool({
          description: `get information about employees from the company's database`,
          parameters: z.object({
            query: z.string().describe('the query string containing the type of information requested about employees'),
          }),
          execute: async ({ query }) => getPayrollData(userId, query, userName),
        }),
    },
 });

    return result.toDataStreamResponse();
}
