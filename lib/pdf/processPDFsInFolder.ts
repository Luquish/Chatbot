import { processPDF } from '@/lib/pdf/readPDF';
import * as fs from 'fs';
import * as path from 'path';

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
};

if (require.main === module) {
  const folderPath = process.argv[2] || 'data'; 
  processPDFsInFolder(folderPath);
}
