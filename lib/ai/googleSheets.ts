// lib/ai/googleSheets.ts

import { google } from 'googleapis';
import { accounts } from '../db/schema/schemas';
import { eq } from 'drizzle-orm';
import { db } from '../db';

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function getPayrollData(userId: string, query: string, userName: string): Promise<string> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID no está definido en las variables de entorno');
    }

    try {
        const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId));
    
        if (!userAccount || userAccount.length === 0) {
          throw new Error('User account not found');
        }
    
        const oauth2Client = createOAuth2Client();
    
        oauth2Client.setCredentials({
          refresh_token: userAccount[0].refresh_token,
        });
    
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
    
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Nómina!A1:P1000',
        });

        const data = response.data.values || [];
        if (data.length === 0) {
          return "No se encontraron datos en la hoja de cálculo.";
        }

        const headers = data[0];
        const employees = data.slice(1);

        function processQuery(query: string, userName: string): string {
            query = query.toLowerCase();
            console.log("Query recibida:", query);

            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const capitalize = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());

            // Función para encontrar empleados por criterios
            const findEmployeesByCriteria = (criteria: (row: any) => boolean) => {
                return employees.filter(criteria);
            };

            // Función para obtener el chief de una división específica
            const getDivisionChief = (division: string) => {
                const chief = findEmployeesByCriteria(row => 
                    normalize(row[7]) === normalize(division) && // Misma división
                    normalize(row[11]).includes('chief')         // Rango Chief
                )[0];

                if (!chief) {
                    return `No se encontró un Chief para la división "${division}".`;
                }

                return `El Chief de la división "${division}" es ${capitalize(chief[4])} ${capitalize(chief[3])} (${chief[10]})`;
            };

            // Función mejorada para obtener información del usuario actual
            const getCurrentUserInfo = () => {
                const currentUser = findEmployeesByCriteria(row => 
                    normalize(`${row[4]} ${row[3]}`).includes(normalize(userName)) ||
                    normalize(row[4]).includes(normalize(userName)) ||
                    normalize(row[3]).includes(normalize(userName))
                )[0];

                if (!currentUser) {
                    return "No se encontraron datos para el usuario actual en la nómina.";
                }

                return currentUser;
            };

            // Manejar consultas sobre jefes/chiefs
            if (query.includes("quien es el jefe") || query.includes("quién es el jefe")) {
                // Si pregunta por el jefe de una división específica
                if (query.includes("de la division") || query.includes("de la división") || 
                    query.includes("del departamento")) {
                    const divisionMatch = query.match(/(?:division|división|departamento)\s+(.+?)(?:\?|$)/i);
                    if (divisionMatch) {
                        const division = divisionMatch[1].trim();
                        return getDivisionChief(division);
                    }
                }
                
                // Si pregunta por su propio jefe
                const currentUser = getCurrentUserInfo();
                if (typeof currentUser === "string") return currentUser;
                
                return getDivisionChief(currentUser[7]);
            }

            // Manejar consultas sobre compañeros
            if (query.includes("mis compañeros") || query.includes("quienes son mis compañeros") || 
                query.includes("quiénes son mis compañeros")) {
                const currentUser = getCurrentUserInfo();
                if (typeof currentUser === "string") return currentUser;

                const colleagues = findEmployeesByCriteria(row => 
                    row[7] === currentUser[7] && // Misma división
                    `${row[4]} ${row[3]}` !== `${currentUser[4]} ${currentUser[3]}` // Excluir al usuario actual
                );

                if (colleagues.length === 0) {
                    return "No se encontraron otros compañeros en tu división.";
                }

                return `Tus compañeros en la división ${currentUser[7]} son:\n${
                    colleagues.map(colleague => 
                        `- ${capitalize(colleague[4])} ${capitalize(colleague[3])} (${colleague[10]})`
                    ).join('\n')
                }`;
            }

            // Manejar consultas sobre "mis datos" o información personal
            if (query.includes("mis datos") || query.includes("mi información")) {
                const currentUser = getCurrentUserInfo();
                if (typeof currentUser === "string") return currentUser;

                return `Aquí está tu información:
                            - Nombre completo: ${capitalize(currentUser[4])} ${capitalize(currentUser[3])}
                            - Legajo: ${currentUser[2]}
                            - División: ${currentUser[7]}
                            - Área: ${currentUser[8]}
                            - Subárea: ${currentUser[9]}
                            - Cargo: ${currentUser[10]}
                            - Fecha de inicio: ${currentUser[5]}`;
            }

            // Manejar consultas sobre información personal del usuario actual
            if (query.includes("mi") || query.includes("yo") || query.includes("estoy")) {
                const currentUser = getCurrentUserInfo();
                if (typeof currentUser === "string") return currentUser;

                if (query.includes("area de trabajo") || query.includes("área de trabajo")) {
                    return `Tu área de trabajo es: ${currentUser[8]}`;
                } else if (query.includes("tipo de empleo")) {
                    return `Tu tipo de empleo es: ${currentUser[11]}`;
                } else if (query.includes("division") || query.includes("división")) {
                    return `Estás en la división: ${currentUser[7]}`;
                }
            }

            // Manejar consultas sobre el equipo de trabajo del usuario
            if (query.includes("quienes trabajan en mi area") || query.includes("quiénes trabajan en mi área")) {
                const currentUser = getCurrentUserInfo();
                if (typeof currentUser === "string") return currentUser;

                const teamMembers = findEmployeesByCriteria(row => row[8] === currentUser[8]);
                return `Los miembros de tu área (${currentUser[8]}) son:\n${teamMembers.map(member => `- ${capitalize(member[4])} ${capitalize(member[3])} (${member[10]})`).join('\n')}`;
            }

            if (query.includes("quienes estan en la misma division") || query.includes("quiénes están en la misma división")) {
                const currentUser = getCurrentUserInfo();
                if (typeof currentUser === "string") return currentUser;

                const divisionMembers = findEmployeesByCriteria(row => row[7] === currentUser[7]);
                return `Los miembros de tu división (${currentUser[7]}) son:\n${divisionMembers.map(member => `- ${capitalize(member[4])} ${capitalize(member[3])} (${member[10]})`).join('\n')}`;
            }

            // Manejar consultas sobre áreas específicas
            if (query.includes("quienes trabajan en el area") || query.includes("quiénes trabajan en el área")) {
                const area = query.split("area")[1].trim();
                const areaMembers = findEmployeesByCriteria(row => normalize(row[8]) === normalize(area));
                return `Los miembros del área "${area}" son:\n${areaMembers.map(member => `- ${capitalize(member[4])} ${capitalize(member[3])} (${member[10]})`).join('\n')}`;
            }

            if (query.includes("cargo de los integrantes de la division") || query.includes("cargo de los integrantes de la división")) {
                const division = query.split("division")[1].trim();
                const divisionMembers = findEmployeesByCriteria(row => normalize(row[7]) === normalize(division));
                return `Los cargos de los integrantes de la división "${division}" son:\n${divisionMembers.map(member => `- ${capitalize(member[4])} ${capitalize(member[3])}: ${member[10]}`).join('\n')}`;
            }

            // Manejar consultas sobre datos de terceros
            if (query.includes("cumpleaños de")) {
                const name = query.split("cumpleaños de")[1].trim();
                const employee = findEmployeesByCriteria(row => normalize(`${row[4]} ${row[3]}`) === normalize(name))[0];
                return employee ? `El cumpleaños de ${capitalize(name)} es el ${employee[5]}` : `No se encontró información para ${name}`;
            }

            if (query.includes("cargo ocupa")) {
                const name = query.split("cargo ocupa")[1].trim();
                const employee = findEmployeesByCriteria(row => normalize(`${row[4]} ${row[3]}`) === normalize(name))[0];
                return employee ? `${capitalize(name)} ocupa el cargo de ${employee[10]}` : `No se encontró información para ${name}`;
            }

            // Si no se encuentra una consulta específica, realizar una búsqueda general
            const matches = findEmployeesByCriteria(row => 
                normalize(`${row[4]} ${row[3]}`).includes(normalize(query)) ||
                normalize(row[10]).includes(normalize(query)) ||
                normalize(row[8]).includes(normalize(query)) ||
                normalize(row[7]).includes(normalize(query))
            );

            if (matches.length > 0) {
                return `Encontré ${matches.length} resultado(s) que coinciden con tu búsqueda:\n${matches.map(row => 
                    `${capitalize(row[4])} ${capitalize(row[3])}: ${row[10]} - ${row[8]} (${row[7]})`
                ).join("\n")}`;
            } else {
                return "No se encontraron resultados para tu búsqueda. Por favor, intenta con términos más generales o verifica la ortografía.";
            }
        }

        return processQuery(query, userName);

    } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('This operation is not supported for this document')) {
            return "Lo siento, no puedo acceder a la información en este momento debido a un problema de permisos o configuración. Por favor, verifica que la hoja de cálculo esté compartida correctamente y que el ID sea el correcto.";
          }
        }
        throw error;
    }
}
