// lib/getCSV/readCSV.ts

import { createResource } from '../actions/resources';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { removeHyphenations } from '../utils/chunking';
import pLimit from 'p-limit';
import { NewResourceParams } from '../db/schema/resources';

/**
 * Define una interfaz para las filas del CSV.
 */
interface CSVRow {
  [key: string]: string;
}

/**
 * Convierte una fecha de DD/MM/YYYY a YYYY-MM-DD o a DD/MM si `fullDate` es falso.
 * @param dateString - Fecha en formato DD/MM/YYYY.
 * @param fullDate - Indica si se incluye el año.
 * @returns Fecha formateada.
 */
const convertDate = (dateString: string, fullDate: boolean = true): string => {
  if (!dateString) return 'desconocido';
  const [day, month, year] = dateString.split('/');
  if (fullDate && year) {
    return `${year}-${month}-${day}`;
  }
  return `${day}/${month}`;
};

/**
 * Convierte una fila de CSV a una oración coherente.
 * @param employeeData - Datos del empleado.
 * @returns Oración representativa de la fila.
 */
const convertRowToSentence = (employeeData: any): string => {
  const {
    sede,
    tipoEmpleo,
    legajo,
    apellido,
    nombre,
    fechaInicio,
    division,
    area,
    subarea,
    equipo,
    cargo,
    seniority,
    dependenciaOrganigrama,
    fechaNacimiento,
    genero,
    nacionalidad,
  } = employeeData;

  const getValue = (value: string | undefined, isDate: boolean = false): string => {
    if (!value || value.trim() === '') {
      return 'desconocido';
    }
    if (isDate) {
      return convertDate(value, false); // Solo día y mes
    }
    return value.trim();
  };

  return `El empleado ${getValue(nombre)} ${getValue(apellido)}, con legajo ${getValue(legajo)}, es ${getValue(tipoEmpleo)} y trabaja en la sede ${getValue(sede)}, en la división ${getValue(division)}, en el área ${getValue(area)} y subárea ${getValue(subarea)}. Trabaja en el equipo ${getValue(equipo)} y su cargo y seniority es ${getValue(cargo)} y ${getValue(seniority)}, respectivamente. Su dependencia organizacional es ${getValue(dependenciaOrganigrama)}. Su cumpleaños es el ${getValue(fechaNacimiento, true)} y nació en ${getValue(nacionalidad)}.`;
};

/**
 * Procesa un archivo CSV, crea recursos por fila y genera embeddings.
 * @param filePath - Ruta al archivo CSV.
 */
export const processCSV = async (filePath: string) => {
  try {
    console.log(`Iniciando el procesamiento del archivo CSV: ${filePath}`);

    const results: CSVRow[] = await new Promise((resolve, reject) => {
      const resultsArray: CSVRow[] = [];

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: CSVRow) => {
          resultsArray.push(row);
        })
        .on('end', () => {
          resolve(resultsArray);
        })
        .on('error', (err) => {
          reject(err);
        });
    });

    const limit = pLimit(5); // Limita a 5 operaciones en paralelo

    // Procesar cada fila del CSV como un recurso separado con control de concurrencia
    const processingPromises = results.map((row) => limit(async () => {
      // Limpia guiones de silabación en cada campo
      const cleanedRow: Record<string, string> = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          cleanedRow[key] = removeHyphenations(row[key]);
        }
      }

      // Convierte la fila a una oración coherente
      const employeeData = {
        sede: cleanedRow['Sede'],
        tipoEmpleo: cleanedRow['Tipo de empleo'],
        legajo: cleanedRow['Legajo'],
        apellido: cleanedRow['Apellido'],
        nombre: cleanedRow['Nombre'],
        fechaInicio: convertDate(cleanedRow['Fecha de inicio']),
        division: cleanedRow['Division'] || 'desconocido',
        area: cleanedRow['Area'] || 'desconocido',
        subarea: cleanedRow['Subarea'] || 'desconocido',
        equipo: cleanedRow['Equipo'] || 'desconocido',
        cargo: cleanedRow['Cargo'],
        seniority: cleanedRow['Seniority'] || 'desconocido',
        dependenciaOrganigrama: cleanedRow['Dependencia organigrama'] || 'desconocido',
        fechaNacimiento: cleanedRow['Fecha de nacimiento'],
        genero: cleanedRow['Género'] || 'desconocido',
        nacionalidad: cleanedRow['Nacionalidad'] || 'desconocido',
      };

      const sentence = convertRowToSentence(employeeData);

      // Crea el recurso sin superposición
      const input: NewResourceParams = { content: sentence };
      const result = await createResource(input); // No se pasa `overlapChars` para CSVs
      console.log(result); // 'Resource successfully created and embedded.'
    }));

    await Promise.all(processingPromises);

    return 'CSV procesado y guardado correctamente.';
  } catch (error) {
    console.error(
      error instanceof Error && error.message.length > 0
        ? error.message
        : 'Error procesando el CSV, por favor intenta de nuevo.'
    );
  }
};
