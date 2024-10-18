// lib/utils/chunking.ts

/**
 * Divide el texto en oraciones completas, incluyendo la puntuación final.
 * @param input - Texto completo a dividir.
 * @returns Array de oraciones.
 */
export const generateSentences = (input: string): string[] => {
    // Expresión regular para dividir por punto, signo de interrogación o exclamación seguido de espacio o fin de línea
    const sentenceEndings = /(?<=[.?!])\s+/g;
    return input.split(sentenceEndings).map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
  };
  
  /**
   * Elimina los guiones de silabación en el texto.
   * @param text - Texto a limpiar.
   * @returns Texto sin guiones de silabación.
   */
  export const removeHyphenations = (text: string): string => {
    return text.replace(/-\s*\n\s*/g, '');
  };
  
  /**
   * Genera chunks con superposición a partir de un array de oraciones.
   * @param sentences - Array de oraciones.
   * @param maxLength - Tamaño máximo de cada chunk en caracteres.
   * @param overlapChars - Número de caracteres de superposición entre chunks.
   * @returns Array de chunks con superposición.
   */
  export const generateChunksWithOverlap = (sentences: string[], maxLength: number, overlapChars: number): string[] => {
    const chunks: string[] = [];
    let currentChunk = '';
  
    for (const sentence of sentences) {
      if ((currentChunk + sentence + ' ').length > maxLength) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          // Mantén la superposición de caracteres
          if (overlapChars > 0) {
            currentChunk = currentChunk.slice(-overlapChars) + sentence + ' ';
          } else {
            currentChunk = sentence + ' ';
          }
        } else {
          // Si una sola oración excede maxLength, se incluye de todos modos
          chunks.push(sentence);
          currentChunk = '';
        }
      } else {
        currentChunk += sentence + ' ';
      }
    }
  
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
  
    return chunks;
  };
  
  export function splitContentIntoSections(content: string): string[] {
    const lines = content.split('\n');
    const sections: string[] = [];
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Ignora líneas vacías y bibliografías/pies de página
      if (line === '' || line.startsWith('Bibliography') || line.match(/^\[\d+\]/)) {
        continue;
      }

      // Detecta subtítulos (negrita, itálica o enumerados)
      if (line.match(/^(\*\*|\*|_|#{1,6}|\d+\.)\s*\w+/) || line.endsWith(':')) {
        if (currentSection) {
          sections.push(currentSection.trim());
        }
        currentSection = line + '\n';
      } else {
        // Maneja bullets
        if (line.startsWith('•') || line.startsWith('-')) {
          currentSection += line + '\n';
        } else if (line.includes(':')) {
          // Maneja líneas con dos puntos
          const [prefix, ...rest] = line.split(':');
          if (rest.length > 0) {
            currentSection += line + '\n';
          } else {
            // Si solo hay contenido antes de los dos puntos, lo consideramos un subtítulo
            if (currentSection) {
              sections.push(currentSection.trim());
            }
            currentSection = line + '\n';
          }
        } else {
          currentSection += line + '\n';
        }
      }
    }

    // Añade la última sección si existe
    if (currentSection) {
      sections.push(currentSection.trim());
    }

    return sections;
  }
