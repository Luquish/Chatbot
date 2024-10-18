import { google } from 'googleapis';
import { accounts } from '../db/schema/schemas';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { DateTime } from 'luxon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { users } from '../db/schema/schemas';


function createOAuth2Client() {
  console.log('Creating OAuth2Client');
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function parseDateTime(dateTimeString: string) {
  const timeZone = 'America/Argentina/Buenos_Aires';
  const currentYear = DateTime.now().setZone(timeZone).year;

  // Manejar formato "dd de mes a las HH:MM AM/PM"
  const spanishDateTimeRegex = /(\d{1,2}) de (\w+)(?: de (\d{4}))? a las (\d{1,2}):(\d{2}) (AM|PM)/i;
  const match = dateTimeString.match(spanishDateTimeRegex);
  if (match) {
    const [, day, monthStr, year, hour, minute, ampm] = match;
    const months: { [key: string]: number } = {
      enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
      julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
    };
    const month = months[monthStr.toLowerCase()];
    const yearNum = year ? parseInt(year) : currentYear;
    let hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    if (ampm.toLowerCase() === 'pm' && hourNum !== 12) hourNum += 12;
    if (ampm.toLowerCase() === 'am' && hourNum === 12) hourNum = 0;

    const dt = DateTime.fromObject(
      { year: yearNum, month, day: parseInt(day), hour: hourNum, minute: minuteNum },
      { zone: timeZone }
    );

    if (!dt.isValid) {
      throw new Error(`Fecha inválida: ${dateTimeString}`);
    }

    return {
      date: null,
      dateTime: dt.toISO({ suppressMilliseconds: true }), // Sin milisegundos
      timeZone
    };
  }

  // Verificar si es una fecha completa (yyyy-mm-dd)
  const fullDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (fullDateRegex.test(dateTimeString)) {
    return {
      date: dateTimeString,
      dateTime: null,
      timeZone
    };
  }

  // Intentar parsear como fecha y hora en formato ISO
  try {
    const dt = DateTime.fromISO(dateTimeString, { zone: timeZone });
    if (dt.isValid) {
      return {
        date: null,
        dateTime: dt.toISO({ suppressMilliseconds: true }), // Sin milisegundos
        timeZone
      };
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }

  // Si no se pudo parsear, lanzar un error
  throw new Error(`Formato de fecha y hora no válido: ${dateTimeString}`);
}

export async function createEvent({
  summary,
  description,
  location,
  startDateTime,
  endDateTime,
  userId,
  attendeesEmails,
}: {
  summary: string,
  description: string,
  location: string,
  startDateTime: string,
  endDateTime: string,
  userId: string,
  attendeesEmails: string[],
}) {
  console.log('Starting createEvent function');
  console.log('User ID:', userId);

  try {
    console.log('Fetching user account');
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    console.log('User account:', userAccount);

    if (!userAccount || !userAccount[0]?.refresh_token) {
      console.error('Refresh token not found for the user');
      return { error: 'No se encontró el token de actualización para el usuario' };
    }

    console.log('Creating OAuth2Client');
    const oauth2Client = createOAuth2Client();

    console.log('Setting OAuth2Client credentials');
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    console.log('Refreshing access token');
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    console.log('Creating calendar instance');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const parsedStart = parseDateTime(startDateTime);
    const parsedEnd = parseDateTime(endDateTime);

    const event: any = {
      summary: summary,
      description: description,
      location: location,
      attendees: attendeesEmails.map(email => ({ email })),
    };

    // Asignar los campos start y end correctamente
    if (parsedStart.date) {
      event.start = { date: parsedStart.date, timeZone: parsedStart.timeZone };
    } else {
      event.start = { dateTime: parsedStart.dateTime, timeZone: parsedStart.timeZone };
    }

    if (parsedEnd.date) {
      event.end = { date: parsedEnd.date, timeZone: parsedEnd.timeZone };
    } else {
      event.end = { dateTime: parsedEnd.dateTime, timeZone: parsedEnd.timeZone };
    }

    console.log('Event object:', event);

    console.log('Inserting event');
    const res = await calendar.events.insert({
      calendarId: 'primary', // Usar 'primary' por defecto
      requestBody: event,
      // sendNotifications: true, // Campo deprecated, eliminar
      sendUpdates: 'all', // Usar sendUpdates en su lugar
      // Puedes agregar otros campos como 'conferenceDataVersion' si es necesario
    });
    console.log('Event created successfully');

    return [{
      name: summary,
      eventLink: res.data.htmlLink,
      startTime: startDateTime,
      endTime: endDateTime,
      attendees: attendeesEmails,
    }];
  } catch (error) {
    console.error('Error in createEvent function:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.data?.error) {
        console.error('Detailed API error:', axiosError.response.data.error);
      }
    }
    throw error;
  }
}

export async function getEvents(userId: string, startDate?: Date, endDate?: Date) {
  console.log('Starting getEvents function');
  console.log('User ID:', userId);
  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);

  try {
    console.log('Fetching user account');
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    console.log('User account:', userAccount);

    if (!userAccount || !userAccount[0]?.refresh_token) {
      console.error('Refresh token not found for the user');
      return { error: 'No se encontró el token de actualización para el usuario' };
    }

    console.log('Creating OAuth2Client');
    const oauth2Client = createOAuth2Client();

    console.log('Setting OAuth2Client credentials');
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    console.log('Refreshing access token');
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    console.log('Creating calendar instance');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log('Fetching events');
    const params: any = {
      calendarId: 'primary',
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (startDate) {
      params.timeMin = startDate.toISOString();
    } else {
      params.timeMin = new Date().toISOString();
    }

    if (endDate) {
      params.timeMax = endDate.toISOString();
    }

    const res = await calendar.events.list(params);
    console.log('Events fetched successfully');

    const events = res.data.items || [];
    console.log('Events:', events);

    return events.map((event: any) => ({
      name: event.summary,
      eventLink: event.htmlLink,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      attendees: event.attendees?.map((attendee: any) => attendee.email) || [],
    }));
  } catch (error) {
    console.error('Error in getEvents function:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.data?.error) {
        console.error('Detailed API error:', axiosError.response.data.error);
      }
    }
    return []; // Return an empty array instead of an error object
  }
}

export async function checkAvailability(userId: string, otherUserEmail: string, date?: string): Promise<string> {
  try {
    // Fetch user data from the database
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
    if (!userAccount || userAccount.length === 0) {
      throw new Error('User account not found');
    }

    // Fetch other user's data from the database
    const otherUser = await db.select().from(users).where(eq(users.email, otherUserEmail)).limit(1);
    if (!otherUser || otherUser.length === 0) {
      throw new Error('Other user not found');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // If no specific date is provided, check availability for the next 7 days
    const startDate = date ? new Date(date) : new Date();
    const endDate = date ? new Date(date) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const userEventsResult = await getEvents(userId, startDate, endDate);
    const otherUserEventsResult = await getEvents(otherUser[0].id, startDate, endDate);

    const userEvents = Array.isArray(userEventsResult) ? userEventsResult : [];
    const otherUserEvents = Array.isArray(otherUserEventsResult) ? otherUserEventsResult : [];

    const busySlots = [...userEvents, ...otherUserEvents].map(event => ({
      start: new Date(event.startTime),
      end: new Date(event.endTime)
    }));

    // Find available slots
    const availableSlots = findAvailableSlots(startDate, endDate, busySlots);

    if (availableSlots.length === 0) {
      return "No hay horarios disponibles en el período solicitado.";
    }

    // Format the response
    let response = date 
      ? `Horarios disponibles para el ${format(startDate, "d 'de' MMMM", { locale: es })}:\n`
      : "Horarios disponibles en los próximos 7 días:\n";

    availableSlots.forEach(slot => {
      response += `- ${format(slot.start, "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })} - ${format(slot.end, "HH:mm", { locale: es })}\n`;
    });

    return response;
  } catch (error) {
    console.error('Error in checkAvailability function:', error);
    throw error;
  }
}

function findAvailableSlots(startDate: Date, endDate: Date, busySlots: {start: Date, end: Date}[]): {start: Date, end: Date}[] {
  const availableSlots = [];
  let currentTime = new Date(startDate);

  while (currentTime < endDate) {
    const dayStart = new Date(currentTime.setHours(9, 0, 0, 0));
    const dayEnd = new Date(currentTime.setHours(18, 0, 0, 0));

    let slotStart = dayStart;
    busySlots.forEach(busySlot => {
      if (busySlot.start > slotStart && busySlot.start < dayEnd) {
        if (busySlot.start.getTime() - slotStart.getTime() >= 30 * 60 * 1000) {
          availableSlots.push({start: slotStart, end: busySlot.start});
        }
        slotStart = busySlot.end;
      }
    });

    if (slotStart < dayEnd) {
      availableSlots.push({start: slotStart, end: dayEnd});
    }

    currentTime.setDate(currentTime.getDate() + 1);
  }

  return availableSlots;
}

export async function deleteEventByTitle(userId: string, eventTitle: string) {
  console.log('Starting deleteEventByTitle function');
  console.log('User ID:', userId);
  console.log('Event Title:', eventTitle);

  try {
    console.log('Fetching user account');
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    console.log('User account:', userAccount);

    if (!userAccount || !userAccount[0]?.refresh_token) {
      console.error('Refresh token not found for the user');
      return { error: 'No se encontró el token de actualización para el usuario' };
    }

    console.log('Creating OAuth2Client');
    const oauth2Client = createOAuth2Client();

    console.log('Setting OAuth2Client credentials');
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    console.log('Refreshing access token');
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    console.log('Creating calendar instance');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log('Searching for events with the given title');
    const events = await calendar.events.list({
      calendarId: 'primary',
      q: eventTitle,
      singleEvents: true,
      orderBy: 'startTime',
    });

    if (!events.data.items || events.data.items.length === 0) {
      console.log('No events found with the given title');
      return { message: 'No se encontraron eventos con el título proporcionado.' };
    }

    console.log(`Found ${events.data.items.length} event(s) with the given title`);
    const event = events.data.items[0];

    console.log('Deleting event');
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: event.id!,
    });

    console.log('Event deleted successfully');
    return { message: `El evento "${eventTitle}" ha sido eliminado con éxito.` };
  } catch (error) {
    console.error('Error in deleteEventByTitle function:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.data?.error) {
        console.error('Detailed API error:', axiosError.response.data.error);
      }
    }
    throw error;
  }
}

export async function modifyEvent({
  userId,
  eventId,
  summary,
  description,
  location,
  startDateTime,
  endDateTime,
  attendeesEmails,
}: {
  userId: string,
  eventId: string,
  summary?: string,
  description?: string,
  location?: string,
  startDateTime?: string,
  endDateTime?: string,
  attendeesEmails?: string[],
}) {
  console.log('Starting modifyEvent function');
  console.log('User ID:', userId);
  console.log('Event ID:', eventId);

  try {
    console.log('Fetching user account');
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    console.log('User account:', userAccount);

    if (!userAccount || !userAccount[0]?.refresh_token) {
      console.error('Refresh token not found for the user');
      return { error: 'No se encontró el token de actualización para el usuario' };
    }

    console.log('Creating OAuth2Client');
    const oauth2Client = createOAuth2Client();

    console.log('Setting OAuth2Client credentials');
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    console.log('Refreshing access token');
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    console.log('Creating calendar instance');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Obtener el evento existente
    const existingEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    const event: any = {
      summary: summary || existingEvent.data.summary,
      description: description || existingEvent.data.description,
      location: location || existingEvent.data.location,
      start: existingEvent.data.start,
      end: existingEvent.data.end,
      attendees: attendeesEmails ? attendeesEmails.map(email => ({ email })) : existingEvent.data.attendees,
    };

    // Solo parsear y actualizar las fechas si se proporcionan nuevas
    if (startDateTime) {
      const parsedStart = parseDateTime(startDateTime);
      event.start = parsedStart.date ? { date: parsedStart.date } : { dateTime: parsedStart.dateTime, timeZone: parsedStart.timeZone };
    }

    if (endDateTime) {
      const parsedEnd = parseDateTime(endDateTime);
      event.end = parsedEnd.date ? { date: parsedEnd.date } : { dateTime: parsedEnd.dateTime, timeZone: parsedEnd.timeZone };
    }

    console.log('Event object:', event);

    console.log('Updating event');
    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
      sendUpdates: 'all',
    });
    console.log('Event updated successfully');

    return {
      name: event.summary,
      eventLink: res.data.htmlLink,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      attendees: event.attendees?.map((attendee: any) => attendee.email) || [],
    };
  } catch (error) {
    console.error('Error in modifyEvent function:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.data?.error) {
        console.error('Detailed API error:', axiosError.response.data.error);
      }
    }
    throw error;
  }
}
