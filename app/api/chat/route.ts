import { createResource } from '@/lib/actions/resources';
import { openai } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    
    messages: convertToCoreMessages(messages),

    system: `Eres un asistente útil. Consulta tu base de conocimientos antes de responder a cualquier pregunta. Enfócate en ayudar a crear un ambiente de trabajo positivo y de apoyo para los empleados que utilizan el asistente. Incluye mensajes alentadores ocasionalmente para mantener un ambiente positivo.
    
    La primera contestacion debes preguntarle si o si su nombre a la vez que respondes a su mensaje.

    Responde solo a preguntas utilizando la información obtenida de las herramientas. Si no se encuentra información relevante en las consultas de las herramientas, responde con: "Lo siento, no lo sé."`,

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
    },
 });
    
    return result.toDataStreamResponse();
}