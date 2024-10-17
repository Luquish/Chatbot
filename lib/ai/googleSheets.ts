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

        function processQuery(query: string): string {
            query = query.toLowerCase();

            // Function to normalize strings for comparison
            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // Function to capitalize first letter of each word
            const capitalize = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());

            // Function to find employees by name
            const findEmployees = (name: string) => {
                const normalizedName = normalize(name);
                const nameParts = normalizedName.split(' ');
                
                const exactMatches = employees.filter(row => {
                    const firstName = normalize(row[4]);
                    const lastName = normalize(row[3]);
                    const fullName = `${firstName} ${lastName}`;
                    return fullName === normalizedName || 
                           firstName === normalizedName || 
                           lastName === normalizedName;
                });

                if (exactMatches.length > 0) {
                    return exactMatches;
                }

                // Si no hay coincidencias exactas, buscamos coincidencias parciales más estrictas
                const partialMatches = employees.filter(row => {
                    const firstName = normalize(row[4]);
                    const lastName = normalize(row[3]);
                    
                    // Verificamos que cada parte del nombre buscado coincida exactamente con el inicio de un nombre o apellido
                    return nameParts.every(part => 
                        firstName.startsWith(part) || lastName.startsWith(part)
                    );
                });

                return partialMatches;
            };

            // Helper function to handle multiple matches
            const handleMultipleMatches = (matches: any[], name: string) => {
                if (matches.length > 1) {
                    const employeeList = matches.map((emp, index) => 
                        `${index + 1}. ${capitalize(emp[4])} ${capitalize(emp[3])} - ${emp[10]}`
                    ).join('\n');
                    return `Encontré múltiples empleados que coinciden con "${name}". Por favor, especifica a cuál te refieres:\n${employeeList}`;
                }
                return null;
            };

            // New function to find the current user
            const findCurrentUser = (userName: string) => {
                const normalizedUserName = normalize(userName);
                const userNameParts = normalizedUserName.split(' ');
                
                return employees.find(row => {
                    const firstName = normalize(row[4]);
                    const lastName = normalize(row[3]);
                    const fullName = `${firstName} ${lastName}`;
                    
                    // Check if the full name matches exactly
                    if (fullName === normalizedUserName) {
                        return true;
                    }
                    
                    // If not an exact match, check if all parts of the userName are present in the full name
                    if (userNameParts.length > 1) {
                        return userNameParts.every(part => fullName.includes(part));
                    }
                    
                    // If only one part is provided, it must match either the first name or last name exactly
                    return firstName === normalizedUserName || lastName === normalizedUserName;
                });
            };

            // Get current user's data
            const currentUser = findCurrentUser(userName) || Array(headers.length).fill('');
            const getCurrentUserData = () => {
                if (currentUser.some(field => field !== '')) {
                    return `Información del usuario actual (${capitalize(currentUser[4])} ${capitalize(currentUser[3])}):\n` +
                           headers.map((header, index) => `${header}: ${currentUser[index] || 'No disponible'}`).join("\n");
                } else {
                    return `No se encontraron datos exactos para el usuario "${userName}" en la nómina. Por favor, verifica que el nombre esté escrito correctamente o contacta a RRHH si crees que esto es un error.`;
                }
            };

            // Handler for current user data queries
            if (query.includes("mis datos") || query.includes("mi información")) {
                return getCurrentUserData();
            }

            // Handler for "toda la información" queries
            if (query.includes("todo sobre") || query.includes("toda la información") || query.includes("todos los datos")) {
                const name = query.split(/sobre|de/).pop()?.trim() || "";
                let matches = findEmployees(name);
                
                const multipleMatchesResponse = handleMultipleMatches(matches, name);
                if (multipleMatchesResponse) return multipleMatchesResponse;

                if (matches.length === 0) {
                    return `No se encontró ningún empleado con el nombre ${name}.`;
                }

                const employee = matches[0];
                return headers.map((header, index) => `${header}: ${employee[index] || 'No disponible'}`).join("\n");
            }

            // Handler for general name queries
            if (query.includes("que sabes de") || query.startsWith("sobre")) {
                const name = query.split(/que sabes de|sobre/).pop()?.trim() || "";
                let matches = findEmployees(name);
                
                if (matches.length === 0) {
                    return `No se encontró ningún empleado con el nombre "${name}". ¿Quieres que busque nombres similares?`;
                }

                const multipleMatchesResponse = handleMultipleMatches(matches, name);
                if (multipleMatchesResponse) return multipleMatchesResponse;

                const employee = matches[0];
                return headers.map((header, index) => `${header}: ${employee[index] || 'No disponible'}`).join("\n");
            }

            // Si no se ha encontrado un tipo de consulta específico, realizar una búsqueda general
            const matches = findEmployees(query);
            if (matches.length > 0) {
                return `Encontré ${matches.length} empleado(s) que coinciden con tu búsqueda:\n${matches.map(row => 
                    `${capitalize(row[4])} ${capitalize(row[3])}: ${row[10]}`
                ).join("\n")}`;
            } else {
                return "No se encontraron resultados para tu búsqueda.";
            }
        }

        return processQuery(query);

    } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('This operation is not supported for this document')) {
            return "Lo siento, no puedo acceder a la información en este momento debido a un problema de permisos o configuración. Por favor, verifica que la hoja de cálculo esté compartida correctamente y que el ID sea el correcto.";
          }
        }
        throw error;
    }
}
