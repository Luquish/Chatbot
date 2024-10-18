// lib/pdf/processPDFsInFolder.ts

import { processPDF } from '@/lib/getPDF/readPDF'; // Ruta correcta utilizando alias
import * as fs from 'fs';
import * as path from 'path';

// Función principal para procesar todos los PDF en una carpeta
export const processPDFsInFolder = async (folderPath: string) => {
  try {
    const files = fs.readdirSync(folderPath);

    // Itera sobre cada archivo en la carpeta
    for (const file of files) {
      const filePath = path.join(folderPath, file);

      // Procesa solo archivos PDF
      if (path.extname(file).toLowerCase() === '.pdf') {
        console.log(`Procesando archivo: ${file}`);
        const result = await processPDF(filePath);
        console.log(`Resultado del procesamiento para ${file}:`, result);
      } else {
        console.log(`El archivo ${file} no es un PDF, saltando...`);
      }
    }
  } catch (error) {
    // Manejo de errores
    if (error instanceof Error) {
      console.error('Error al procesar la carpeta:', error.message);
    } else {
      console.error('Error al procesar la carpeta:', error);
    }
  }
};

// Código para ejecutar el script directamente desde la línea de comandos
if (require.main === module) {
  const folderPath = process.argv[2] || 'data/pdfs';
  processPDFsInFolder(folderPath)
    .then(() => {
      console.log('Todos los PDFs han sido procesados.');
    })
    .catch(error => {
      console.error('Error al procesar los PDFs:', error);
    });
}
