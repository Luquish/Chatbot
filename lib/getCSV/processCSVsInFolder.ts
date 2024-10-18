// Este archivo contiene funciones para procesar archivos CSV en una carpeta

import { processCSV } from '@/lib/getCSV/readCSV';
import * as fs from 'fs';
import * as path from 'path';

// Función principal para procesar todos los CSV en una carpeta
export const processCSVsInFolder = async (folderPath: string) => {
  try {
    console.log(`Leyendo la carpeta: ${folderPath}`);
    const files = fs.readdirSync(folderPath);
    console.log(`Archivos encontrados en la carpeta: ${files}`);

    // Itera sobre cada archivo en la carpeta
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      console.log(`Procesando archivo: ${filePath}`);

      // Procesa solo archivos CSV
      if (path.extname(file).toLowerCase() === '.csv') {
        console.log(`El archivo ${file} es un CSV, iniciando procesamiento...`);
        const result = await processCSV(filePath);
        console.log(`Resultado del procesamiento para ${file}: Completado`);
      } else {
        console.log(`El archivo ${file} no es un CSV, saltando...`);
      }
    }
  } catch (error) {
    // Manejo de errores
    console.error('Error en processCSVsInFolder:');
    if (error instanceof Error) {
      console.error('Error al procesar la carpeta:', error.message);
    } else {
      console.error('Error al procesar la carpeta:', error);
    }
  }
};

// Código para ejecutar el script directamente desde la línea de comandos
if (require.main === module) {
  const folderPath = process.argv[2] || 'data/csvs';
  console.log(`Iniciando el procesamiento de CSVs en la carpeta: ${folderPath}`);
  processCSVsInFolder(folderPath)
    .then(() => {
      console.log('Todos los CSVs han sido procesados.');
    })
    .catch(error => {
      console.error('Error al procesar los CSVs:', error);
    });
}
