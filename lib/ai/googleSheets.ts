// lib/ai/googleSheets.ts

import { google } from 'googleapis';
import { accounts } from '../db/schema/schemas';
import { eq } from 'drizzle-orm';
import { db } from '../db';

function createOAuth2Client() {
  console.log('Creating OAuth2Client');
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function getPayrollData(userId: string, query: string): Promise<string> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID no está definido en las variables de entorno');
    }

    console.log('Spreadsheet ID:', spreadsheetId);
  
    try {
        console.log('Fetching user account');
        const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId));
    
        if (!userAccount || userAccount.length === 0) {
          throw new Error('User account not found');
        }
    
        const oauth2Client = createOAuth2Client();
    
        console.log('Setting OAuth2Client credentials');
        oauth2Client.setCredentials({
          refresh_token: userAccount[0].refresh_token,
        });
    
        console.log('Refreshing access token');
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
    
        console.log('Creating sheets instance');
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
        console.log('Fetching spreadsheet data');
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Sheet1!A1:P1000', // Asegúrate de que este rango sea correcto
        });
    
        console.log('Response:', JSON.stringify(response.data, null, 2));

        const data = response.data.values || [];
        if (data.length === 0) {
        return "No se encontraron datos en la hoja de cálculo.";
        }

        const headers = data[0];
        const employees = data.slice(1);

        const [queryType, name] = query.split(':').map(s => s.trim());

        const employeeIndex = employees.findIndex(row => 
        row[3].toLowerCase().includes(name.toLowerCase()) || row[4].toLowerCase().includes(name.toLowerCase())
        );

        if (employeeIndex === -1) {
        return `No se encontró ningún empleado con el nombre ${name}.`;
        }

        const employee = employees[employeeIndex];

        if (queryType.toLowerCase() === 'todo' || queryType.toLowerCase() === 'toda la información') {
            return `
              Información completa de ${employee[3]} ${employee[4]}:
              - Sede: ${employee[0]}
              - Tipo de empleo: ${employee[1]}
              - Legajo: ${employee[2]}
              - Fecha de inicio: ${employee[5]}
              - División: ${employee[6]}
              - Área: ${employee[7]}
              - Subárea: ${employee[8]}
              - Equipo: ${employee[9]}
              - Cargo: ${employee[10]}
              - Seniority: ${employee[11]}
              - Dependencia organigrama: ${employee[12]}
              - Fecha de nacimiento: ${employee[13]}
              - Género: ${employee[14]}
              - Nacionalidad: ${employee[15]}`;
          }

          switch (queryType.toLowerCase()) {
            case 'sede':
                return `La sede de ${employee[3]} ${employee[4]} es ${employee[0]}.`;
            case 'tipo de empleo':
                return `El tipo de empleo de ${employee[3]} ${employee[4]} es ${employee[1]}.`;
            case 'legajo':
                return `El legajo de ${employee[3]} ${employee[4]} es ${employee[2]}.`;
            case 'fecha de inicio':
                return `La fecha de inicio de ${employee[3]} ${employee[4]} es ${employee[5]}.`;
            case 'división':
                return `La división de ${employee[3]} ${employee[4]} es ${employee[6]}.`;
            case 'área':
                return `${employee[3]} ${employee[4]} trabaja en el área de ${employee[7]}.`;
            case 'subárea':
              return `La subárea de ${employee[3]} ${employee[4]} es ${employee[8]}.`;
            case 'equipo':
                return `El equipo de ${employee[3]} ${employee[4]} es ${employee[9]}.`;
            case 'cargo':
                return `El cargo de ${employee[3]} ${employee[4]} es ${employee[10]}.`;
            case 'seniority':
                return `El seniority de ${employee[3]} ${employee[4]} es ${employee[11]}.`;
            case 'dependencia organigrama':
                return `La dependencia organigrama de ${employee[3]} ${employee[4]} es ${employee[12]}.`;
            case 'fecha de nacimiento':
            case 'cumpleaños':
                return `La fecha de nacimiento de ${employee[3]} ${employee[4]} es ${employee[13]}.`;
            case 'género':
                return `El género de ${employee[3]} ${employee[4]} es ${employee[14]}.`;
            case 'nacionalidad':
                return `La nacionalidad de ${employee[3]} ${employee[4]} es ${employee[15]}.`;
            default:
                return `No se pudo procesar la consulta. Por favor, especifica qué información quieres saber sobre ${name} o solicita "toda la información".`;
            }
        } catch (error) {
            console.error('Error in getPayrollData function:', error);
            if (error instanceof Error) {
              console.error('Error message:', error.message);
              console.error('Error stack:', error.stack);
              if (error.message.includes('This operation is not supported for this document')) {
                return "Lo siento, no puedo acceder a la información en este momento debido a un problema de permisos o configuración. Por favor, verifica que la hoja de cálculo esté compartida correctamente y que el ID sea el correcto.";
              }
            }
            throw error;
          }
        }