// lib/ai/embedding.ts

import { embedMany, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { sql } from 'drizzle-orm';
import { cosineDistance, desc, gt } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';
import { db } from '../db';

/**
 * Configura el modelo de embeddings.
 */
const embeddingModel = openai.embedding('text-embedding-ada-002'); // Asegúrate de usar el modelo correcto

/**
 * Genera embeddings para un array de textos.
 * @param inputs - Array de textos a embeder.
 * @returns Array de objetos con contenido y embedding.
 */
export const generateEmbeddings = async (
  inputs: string[],
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const cleanInputs = inputs.map(input => input.replace(/\n/g, ' '));
  const { embeddings: generatedEmbeddings } = await embedMany({
    model: embeddingModel,
    values: cleanInputs,
  });
  return generatedEmbeddings.map((e, i) => ({ content: cleanInputs[i], embedding: e }));
};

/**
 * Genera un solo embedding para un texto.
 * @param value - Texto a embeder.
 * @returns Vector de embedding.
 */
export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replace(/\n/g, ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

/**
 * Encuentra contenido relevante basado en una consulta del usuario.
 * @param userQuery - Consulta del usuario.
 * @returns Array de contenido similar con su puntuación de similitud.
 */
export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded,
  )})`;
  const similarGuides = await db
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy(t => desc(t.similarity))
    .limit(4);
  return similarGuides;
};

/**
 * Obtiene todos los embeddings almacenados.
 * @returns Array de contenido y embeddings.
 */
export const getAllEmbeddings = async () => {
  return db
    .select({ name: embeddings.content, embedding: embeddings.embedding })
    .from(embeddings);
};
