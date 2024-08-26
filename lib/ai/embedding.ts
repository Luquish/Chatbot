import * as fs from 'fs';
import { embedMany, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';

// Configura el modelo de embeddings
const embeddingModel = openai.embedding('text-embedding-3-small');

// Función para dividir el texto en chunks
const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .filter(i => i !== '');
};

// Función unificada para generar embeddings
export const generateEmbeddings = async (
  input: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  let content = input;

  // Genera los chunks del contenido
  const chunks = generateChunks(content);

  // Genera embeddings a partir de los chunks
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
      model: embeddingModel,
      value: input,
    });
    return embedding;
  };

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
  
  export const getAllEmbeddings = async () => {
    return db
      .select({ name: embeddings.content, embedding: embeddings.embedding })
      .from(embeddings);
  };
