import { createResourceFromText, createResourceFromPDF} from '@/lib/actions/resources';
import { openai } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';
import crypto from 'crypto';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),

    system: `Eres un asistente útil. Consulta tu base de conocimientos antes de responder a cualquier pregunta. Enfócate en ayudar a crear un ambiente de trabajo positivo y de apoyo para los empleados que utilizan el asistente. Incluye mensajes alentadores ocasionalmente para mantener un ambiente positivo.
    
    La primera contestacion debes preguntarle si o si su nombre a la vez que respondes a su mensaje.

    Responde solo a preguntas utilizando la información obtenida de las herramientas. Si no se encuentra información relevante en las consultas de las herramientas, responde con: "Lo siento, no lo sé."`,

    tools: {
        addResource: tool({
          description: `agrega un recurso a tu base de conocimientos.
            Si el usuario proporciona un conocimiento aleatorio sin que se lo pidas, usa esta herramienta sin pedir confirmación.`,
          parameters: z.object({
            content: z
              .string()
              .describe('el contenido o recurso a agregar a la base de conocimientos'),
          }),
          execute: async ({ content }) => createResourceFromText({ content, contentHash: crypto.createHash('sha256').update(content).digest('hex')
           }),
        }),
        getInformation: tool({
          description: `obtén información de tu base de conocimientos para responder preguntas.`,
          parameters: z.object({
            question: z.string().describe('la pregunta del usuario'),
          }),
          execute: async ({ question }) => findRelevantContent(question),
        }),
      },
      
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}