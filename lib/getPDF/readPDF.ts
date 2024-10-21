// lib/pdf/readPDF.ts

import { createResource } from '../actions/resources';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { removeHyphenations } from '../utils/chunking';

/**
 * Procesa un archivo PDF, extrae párrafos y crea recursos individuales.
 * @param filePath - Ruta al archivo PDF.
 */
export const processPDF = async (filePath: string) => {
  try {
    // Verifica que el archivo es un PDF
    if (path.extname(filePath).toLowerCase() !== '.pdf') {
      throw new Error('El archivo proporcionado no es un PDF.');
    }

    // Lee el archivo PDF
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);

    // Extrae el texto del PDF
    let pdfText = pdfData.text;

    // Si el texto es insuficiente, usa OCR
    if (!pdfText || pdfText.trim().length < 50) {
      console.log('El texto es escaso o nulo, intentando OCR...');
      const ocrText = await extractTextUsingOCR(fileBuffer);
      pdfText = ocrText ? ocrText : pdfText;
    }

    // Limpia el texto eliminando guiones de silabación
    const cleanedText = removeHyphenations(pdfText);

    // Crea un único recurso para todo el contenido del PDF
    const input = { content: cleanedText };
    const result = await createResource(input);
    console.log(result);

    return 'PDF procesado y guardado correctamente.';
  } catch (error) {
    // Manejo de errores
    console.error(
      error instanceof Error && error.message.length > 0
        ? error.message
        : 'Error procesando el PDF, por favor intenta de nuevo.'
    );
  }
};

/**
 * Extrae texto usando OCR de imágenes en el PDF.
 * @param fileBuffer - Buffer del archivo PDF.
 * @returns Texto extraído mediante OCR.
 */
const extractTextUsingOCR = async (fileBuffer: Buffer): Promise<string> => {
  try {
    const images = await convertPdfToImages(fileBuffer);
    const ocrPromises = images.map(imageBuffer =>
      Tesseract.recognize(imageBuffer, 'spa', { // Cambia a 'spa' si el texto está en español
        logger: m => console.log(m),
      })
    );
    const ocrResults = await Promise.all(ocrPromises);
    return ocrResults.map(result => result.data.text).join('\n');
  } catch (error) {
    console.error('Error durante el OCR:', error);
    return '';
  }
};

/**
 * Convierte un PDF a imágenes utilizando `pdftoppm`.
 * @param fileBuffer - Buffer del archivo PDF.
 * @returns Array de buffers de imágenes.
 */
const convertPdfToImages = async (fileBuffer: Buffer): Promise<Buffer[]> => {
  const tempDir = path.join(__dirname, 'temp_images');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const tempFilePath = path.join(tempDir, `temp_${Date.now()}.pdf`);
  fs.writeFileSync(tempFilePath, fileBuffer);

  const { exec } = require('child_process');
  const imagesDir = path.join(tempDir, `images_${Date.now()}`);
  fs.mkdirSync(imagesDir);

  await new Promise<void>((resolve, reject) => {
    exec(`pdftoppm -png "${tempFilePath}" "${imagesDir}/page"`, (error: any, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
      } else {
        if (stderr) {
          console.warn('Advertencias durante la conversión de PDF a imágenes:', stderr);
        }
        resolve();
      }
    });
  });

  const imageFiles = fs.readdirSync(imagesDir).filter((file: string) => file.endsWith('.png'));
  const imageBuffers = imageFiles.map((file: string) => fs.readFileSync(path.join(imagesDir, file)));

  // Limpia archivos temporales
  fs.rmSync(tempFilePath, { force: true });
  fs.rmSync(imagesDir, { recursive: true, force: true });

  return imageBuffers;
};
