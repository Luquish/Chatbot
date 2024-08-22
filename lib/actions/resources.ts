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
import * as pdfjsLib from 'pdfjs-dist'; // Importamos pdfjs-dist correctamente
import { sql } from 'drizzle-orm';

// Configuración opcional del worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

// Función para generar un hash del contenido
const generateHash = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

// Función para obtener el número de páginas usando pdfjs-dist
const getNumberOfPages = async (fileName: string): Promise<number> => {
  const fullPath = `/app/pdfs/${fileName}`;
  const dataBuffer = fs.readFileSync(fullPath);
  const pdfDoc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
  return pdfDoc.numPages;
};

interface TextItem {
    str: string;
  }
  
  interface TextMarkedContent {
    // Define properties of TextMarkedContent if needed
  }
  
  const isTextItem = (item: TextItem | TextMarkedContent): item is TextItem => {
    return (item as TextItem).str !== undefined;
  };

// Función para leer una cantidad específica de páginas usando pdfjs-dist
const readPdfPages = async (fileName: string, pagesToRead: number[]): Promise<string> => {
  const fullPath = `/app/pdfs/${fileName}`;
  const dataBuffer = fs.readFileSync(fullPath);
  const pdfDoc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

  let content = '';
  for (const pageNum of pagesToRead) {
    if (pageNum <= pdfDoc.numPages) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter(isTextItem)
        .map(item => item.str)
        .join(' ');
    content += pageText + '\n';
      
    }
  }

  return content;
};

// Función para generar un hash condicional usando pdfjs-dist
const generateConditionalHash = async (fileName: string): Promise<string> => {
  const numPages = await getNumberOfPages(fileName);

  let contentToHash = '';

  if (numPages > 50) {
    // Leer las primeras 3 páginas
    contentToHash = await readPdfPages(fileName, [1, 2, 3]);
  } else {
    // Leer todo el documento
    contentToHash = await readPdfPages(fileName, Array.from({ length: numPages }, (_, i) => i + 1));
  }

  return generateHash(contentToHash);
};

// Implementación en createResourceFromPDF
export const createResourceFromPDF = async (fileName: string) => {
  try {
    // Genera el hash condicional
    const contentHash = await generateConditionalHash(fileName);

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
    const extractedContent = await readPdfPages(fileName, [1, 2, 3]);
    const embeddings = await generateEmbeddingsFromPdf(fileName);

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
