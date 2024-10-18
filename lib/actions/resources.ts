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
import { removeHyphenations, splitContentIntoSections } from '../utils/chunking';

interface CreateResourceOptions {
  overlapChars?: number;
}

export const createResource = async (input: NewResourceParams, options?: CreateResourceOptions) => {
  try {
    const { content } = insertResourceSchema.parse(input);

    // Elimina guiones de silabación
    const cleanedContent = removeHyphenations(content);

    // Divide el contenido en secciones basadas en subtítulos y criterios especificados
    const sections = splitContentIntoSections(cleanedContent);

    // Inicia una transacción para asegurar la consistencia
    await db.transaction(async (tx) => {
      for (const section of sections) {
        // Verifica si la sección tiene al menos 10 palabras
        if (section.split(/\s+/).length < 10) continue;

        // Inserta el recurso en `resources`
        const [resource] = await tx
          .insert(resources)
          .values([{ content: section }])
          .returning();

        // Genera embeddings para la sección
        const embeddingsData = await generateEmbeddings([section]);

        // Prepara los datos para insertar en `embeddings`
        const embeddingsToInsert = embeddingsData
          .filter(embedding => embedding.content.split(/\s+/).length >= 2) // Filtra embeddings con menos de 2 palabras
          .map(embedding => ({
            resourceId: resource.id,
            content: embedding.content,
            embedding: embedding.embedding,
          }));

        // Inserta los embeddings en la tabla `embeddings`
        if (embeddingsToInsert.length > 0) {
          await tx.insert(embeddingsTable).values(embeddingsToInsert);
        }
      }
    });

    return 'Resources successfully created and embedded.';
  } catch (error) {
    console.error(error);
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error, please try again.';
  }
};
