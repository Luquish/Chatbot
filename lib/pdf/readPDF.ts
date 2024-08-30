import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { createResource } from '../actions/resources';

// Función que procesa el PDF y maneja diferentes tipos de contenido
export const processPDF = async (filePath: string) => {
  try {
    // Lee el archivo PDF
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);

    // Intenta extraer el texto del PDF
    let pdfText = pdfData.text;

    // Si el texto extraído es muy corto o nulo, usa OCR para extraer texto de imágenes
    if (!pdfText || pdfText.trim().length < 50) {
      console.log('El texto es escaso o nulo, intentando OCR...');
      const ocrText = await extractTextUsingOCR(fileBuffer);
      pdfText = ocrText ? ocrText : pdfText; // Usa el texto OCR si está disponible
    }

    // Inserta el contenido en la base de datos junto con los embeddings
    const result = await createResource({ content: pdfText });

    return result;
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error processing PDF, please try again.';
  }
};

// Función auxiliar que utiliza OCR para extraer texto de imágenes en el PDF
const extractTextUsingOCR = async (fileBuffer: Buffer): Promise<string> => {
  const ocrPromises = [];
  
  // Parseamos el PDF para obtener el texto
  const pdfData = await pdfParse(fileBuffer);
  
  // Aquí asumimos que el texto completo está en pdfData.text
  const pdfText = pdfData.text;
  
  // Aplicamos OCR a cada imagen potencialmente encontrada en el texto del PDF
  const ocrPromise = Tesseract.recognize(Buffer.from(pdfText), 'eng', {
    logger: m => console.log(m), // Para ver el progreso
  });
  
  ocrPromises.push(ocrPromise);
  
  const ocrResults = await Promise.all(ocrPromises);
  return ocrResults.map(result => result.data.text).join('\n');
};

// Función para leer archivos de una carpeta y procesar cada PDF
export const processPDFsInFolder = async (folderPath: string) => {
  try {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      
      if (path.extname(file).toLowerCase() === '.pdf') {
        console.log(`Procesando archivo: ${file}`);
        const result = await processPDF(filePath);
        console.log(`Resultado del procesamiento para ${file}:`, result);
      } else {
        console.log(`El archivo ${file} no es un PDF, saltando...`);
      }
    }
  } catch (error) {
        if (error instanceof Error) {
        console.error('Error al procesar la carpeta:', error.message);
        } else {
        console.error('Error al procesar la carpeta:', error);
        }
    }
}
