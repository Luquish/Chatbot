// import { google } from 'googleapis';
// import { OAuth2Client } from 'google-auth-library';

// // Configuración del cliente OAuth2
// const oAuth2Client = new OAuth2Client(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );

// export async function createEvent({
//   eventName,
//   startTime,
//   endTime,
//   description,
//   calendarId = 'primary', // Calendar ID opcional, por defecto es el calendario principal
// }: {
//   eventName: string;
//   startTime: string;
//   endTime: string;
//   description?: string;
//   calendarId?: string;
// }) {
//   try {
//     // Autenticar al cliente
//     oAuth2Client.setCredentials({
//       refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
//     });

//     const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

//     // Crear el objeto del evento
//     const event = {
//       summary: eventName,
//       description: description || '',
//       start: {
//         dateTime: new Date(startTime).toISOString(),
//         timeZone: 'America/Argentina/Buenos_Aires',
//       },
//       end: {
//         dateTime: new Date(endTime).toISOString(),
//         timeZone: 'America/Argentina/Buenos_Aires',
//       },
//     };

//     // Insertar el evento en Google Calendar
//     const response = await calendar.events.insert({
//       calendarId: calendarId, // Usar el calendarId proporcionado, o 'primary' por defecto
//       requestBody: event,
//     });

//     // Devolver un mensaje de éxito y el enlace al evento
//     return {
//       success: true,
//       message: `El evento "${eventName}" se creó correctamente en el calendario "${calendarId}". Puedes verlo [aquí](${response.data.htmlLink}).`,
//       eventId: response.data.id,
//       eventLink: response.data.htmlLink,
//     };
//   } catch (error) {
//     console.error('Error al crear el evento en Google Calendar:', error);
//     let errorMessage = 'Hubo un error al crear el evento.';
//     if (error instanceof Error) {
//         errorMessage = error.message;
//       }
//       return {
//         success: false,
//         message: errorMessage,
//       };
//   }
// }
