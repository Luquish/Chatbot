// lib/actions/resource.ts
'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from '@/lib/db/schema/resources';
import { db } from '../db';
import { generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '../db/schema/embeddings';
import { generateSentences, generateChunksWithOverlap, removeHyphenations } from '../utils/chunking';

interface CreateResourceOptions {
  overlapChars?: number; // Número de caracteres para superposición; 0 o undefined para sin superposición
}

export const createResource = async (input: NewResourceParams, options?: CreateResourceOptions) => {
  try {
    const { content } = insertResourceSchema.parse(input);

    // Elimina guiones de silabación
    const cleanedContent = removeHyphenations(content);

    // Divide el contenido en oraciones
    const sentences = generateSentences(cleanedContent);

    // Genera chunks con o sin superposición según las opciones
    let chunks: string[];

    if (options && options.overlapChars && options.overlapChars > 0) {
      // Con superposición
      const maxLength = 500; // Define el tamaño máximo del chunk, ajustar según necesidad
      chunks = generateChunksWithOverlap(sentences, maxLength, options.overlapChars);
    } else {
      // Sin superposición, cada chunk es una oración
      chunks = sentences;
    }

    // Inicia una transacción para asegurar la consistencia
    await db.transaction(async (tx) => {
      // Inserta el recurso en `resources`
      const [resource] = await tx
        .insert(resources)
        .values([{ content: cleanedContent }])
        .returning();

      // Genera embeddings para los chunks
      const embeddingsData = await generateEmbeddings(chunks);

      // Prepara los datos para insertar en `embeddings`
      const embeddingsToInsert = embeddingsData.map(embedding => ({
        resourceId: resource.id,
        content: embedding.content,
        embedding: embedding.embedding,
      }));

      // Inserta los embeddings en la tabla `embeddings`
      await tx.insert(embeddingsTable).values(embeddingsToInsert);
    });

    return 'Resource successfully created and embedded.';
  } catch (error) {
    console.error(error);
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error, please try again.';
  }
};
