import { google } from 'googleapis';
import { accounts } from '../db/schema/schemas';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { DateTime } from 'luxon';

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
      // eventType: eventType, // Eliminar este campo
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

export async function getEvents(userId: string) {
  console.log('Starting getEvents function');
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

    console.log('Fetching events');
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: DateTime.now().toISO({ suppressMilliseconds: true }),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
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
    throw error;
  }
}

async function deleteCalendarEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    console.log('Fetching user account');
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);

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

    console.log('Creating calendar instance');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log('Deleting event');
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    console.log('Event deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteCalendarEvent function:', error);
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
    return false;
  }
}
