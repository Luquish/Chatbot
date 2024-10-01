// lib/actions/embeddings.ts

import { db } from '../db';
import { embeddings } from '../db/schema/embeddings';

interface CreateEmbeddingInput {
  resourceId: string;
  content: string;
  embedding: number[];
}

// Inserta múltiples embeddings en la tabla `embeddings`
export const createEmbedding = async (inputs: CreateEmbeddingInput[]) => {
  return await db.insert(embeddings).values(
    inputs.map(input => ({
      resourceId: input.resourceId,
      content: input.content,
      embedding: input.embedding,
    }))
  );
};
