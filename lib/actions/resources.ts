'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from '@/lib/db/schema/resources';
import { db } from '../db';
import { generateEmbeddingsFromPdf, generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '../db/schema/embeddings';
import * as fs from 'fs';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { sql } from 'drizzle-orm';

// Función para generar un hash del contenido
const generateHash = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

// Función para leer el número de páginas del PDF
const getNumberOfPages = async (filePath: string): Promise<number> => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.numpages;
};

// Función para leer una cantidad específica de páginas del PDF
const readPdfPages = async (filePath: string, pagesToRead: number[]): Promise<string> => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  let content = '';
  pagesToRead.forEach(pageNum => {
    if (pageNum <= data.numpages) {
      content += data.text.split('\n\n')[pageNum - 1];  // Tomando la página como un bloque de texto
    }
  });

  return content;
};

// Función para generar un hash condicional
const generateConditionalHash = async (filePath: string): Promise<string> => {
  const numPages = await getNumberOfPages(filePath);

  let contentToHash = '';

  if (numPages > 50) {
    // Leer las primeras 3 páginas
    contentToHash = await readPdfPages(filePath, [1, 2, 3]);
  } else {
    // Leer todo el documento
    contentToHash = await fs.promises.readFile(filePath, 'utf-8');
  }

  return generateHash(contentToHash);
};

// Implementación en createResourceFromPDF
export const createResourceFromPDF = async (filePath: string) => {
  try {
    // Genera el hash condicional
    const contentHash = await generateConditionalHash(filePath);

    // Verifica si el hash ya existe en la base de datos
    const existingResource = await db
      .select()
      .from(resources)
      .where(sql`${resources.contentHash} = ${contentHash}`)
      .limit(1);

    if (existingResource.length > 0) {
      console.log('El documento ya ha sido almacenado previamente.');
      return 'El documento ya ha sido almacenado previamente.';
    }

    // Si no existe, proceder a generar los embeddings y guardar en la base de datos
    const extractedContent = await fs.promises.readFile(filePath, 'utf-8');
    const embeddings = await generateEmbeddingsFromPdf(filePath);

    const [resource] = await db
      .insert(resources)
      .values({ content: extractedContent, contentHash })
      .returning();

    await db.insert(embeddingsTable).values(
      embeddings.map(embedding => ({
        resourceId: resource.id,
        ...embedding,
      })),
    );

    return 'Resource successfully created and embedded.';
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error, please try again.';
  }
};

// ------------------------------------------------------------------------------------------

export const createResourceFromText = async (input: NewResourceParams) => {
    try {
      const { content } = insertResourceSchema.parse(input);
  
      // Genera un hash del contenido
      const contentHash = generateHash(content);
  
      // Verifica si el hash ya existe en la base de datos
      const existingResource = await db
        .select()
        .from(resources)
        .where(sql`${resources.contentHash} = ${contentHash}`)
        .limit(1);
  
      if (existingResource.length > 0) {
        console.log('El documento ya ha sido almacenado previamente.');
        return 'El documento ya ha sido almacenado previamente.';
      }
  
      // Genera los embeddings desde el contenido de texto
      const embeddings = await generateEmbeddings(content);
  
      // Inserta el recurso en la base de datos
      const [resource] = await db
        .insert(resources)
        .values({ content, contentHash })
        .returning();
  
      // Inserta los embeddings en la base de datos
      await db.insert(embeddingsTable).values(
        embeddings.map(embedding => ({
          resourceId: resource.id,
          ...embedding,
        })),
      );
  
      return 'Resource from text successfully created and embedded.';
    } catch (error) {
      return error instanceof Error && error.message.length > 0
        ? error.message
        : 'Error, please try again.';
    }
  };
