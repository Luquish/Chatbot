import { google } from 'googleapis';
import { accounts } from '../db/schema/schemas';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { DateTime } from 'luxon';
import { format, startOfDay, isBefore } from 'date-fns';
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

    // Verificar horario laboral
    const parsedStart = parseDateTime(startDateTime);
    const parsedEnd = parseDateTime(endDateTime);
    
    const startHour = DateTime.fromISO(parsedStart.dateTime || '').hour;
    const endHour = DateTime.fromISO(parsedEnd.dateTime || '').hour;
    
    if (startHour < 8 || startHour > 17 || endHour < 8 || endHour > 17) {
      return { 
        error: 'El horario de la reunión debe estar dentro del horario laboral (8 AM - 5 PM)' 
      };
    }

    // Verificar disponibilidad de los asistentes
    if (attendeesEmails && attendeesEmails.length > 0) {
      for (const email of attendeesEmails) {
        const userEvents = await getEvents(userId, new Date(parsedStart.dateTime!), new Date(parsedEnd.dateTime!));
        const otherUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (!otherUser || otherUser.length === 0) {
          return {
            error: `No se encontró el usuario con email ${email} en el sistema.`
          };
        }

        const otherUserEvents = await getEvents(otherUser[0].id, new Date(parsedStart.dateTime!), new Date(parsedEnd.dateTime!));
        
        // Check if either result is an error object
        if ('error' in userEvents || 'error' in otherUserEvents) {
          return { error: 'Error al obtener eventos del calendario' };
        }

        // Now we know both are arrays
        const hasConflict = [...userEvents, ...otherUserEvents].some(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          const proposedStart = new Date(parsedStart.dateTime!);
          const proposedEnd = new Date(parsedEnd.dateTime!);
          
          return (
            (proposedStart >= eventStart && proposedStart < eventEnd) ||
            (proposedEnd > eventStart && proposedEnd <= eventEnd) ||
            (proposedStart <= eventStart && proposedEnd >= eventEnd)
          );
        });

        if (hasConflict) {
          return {
            error: `${email} tiene un conflicto de horario en el período seleccionado. Por favor, elige otro horario.`
          };
        }
      }
    }

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

// Add new interface for event details
interface EventWithCreator {
  id: string;
  name: string;
  eventLink: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  description?: string;
  creator?: {
    email: string;
    self?: boolean;
  };
}

// Modify getEvents to include description and creator
export async function getEvents(userId: string, startDate?: Date, endDate?: Date): Promise<EventWithCreator[] | { error: string }> {
  try {
    console.log('Starting getEvents function');
    console.log('User ID:', userId);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

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
      id: event.id,
      name: event.summary,
      eventLink: event.htmlLink,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      attendees: event.attendees?.map((attendee: any) => attendee.email) || [],
      description: event.description || '',
      creator: event.creator
    }));
  } catch (error: unknown) {
    console.error('Error in getEvents function:', error);
    if (error instanceof Error && error.message?.includes('invalid_grant')) {
      return { error: 'El token de acceso ha expirado. Por favor, vuelve a iniciar sesión.' };
    }
    return { error: 'Error al obtener eventos del calendario' };
  }
}

function findAvailableSlots(startDate: Date, endDate: Date, busySlots: Array<{ start: Date; end: Date }>) {
  const availableSlots: Array<{ start: Date; end: Date }> = [];
  let currentDate = startOfDay(startDate);

  while (isBefore(currentDate, endDate)) {
    // Solo considerar horario laboral (8 AM - 5 PM)
    const workDayStart = new Date(currentDate);
    workDayStart.setHours(8, 0, 0);
    const workDayEnd = new Date(currentDate);
    workDayEnd.setHours(17, 0, 0);

    // Filtrar eventos del día actual
    const dayEvents = busySlots.filter(slot => {
      const slotDate = startOfDay(slot.start);
      return slotDate.getTime() === currentDate.getTime();
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    let slotStart = workDayStart;

    if (dayEvents.length === 0) {
      // Si no hay eventos, todo el día está disponible
      availableSlots.push({ start: workDayStart, end: workDayEnd });
    } else {
      // Procesar cada evento y encontrar los espacios libres entre ellos
      for (const event of dayEvents) {
        if (event.start > slotStart && event.start <= workDayEnd) {
          // Agregar slot disponible antes del evento si hay al menos 30 minutos
          if (event.start.getTime() - slotStart.getTime() >= 30 * 60 * 1000) {
            availableSlots.push({ start: slotStart, end: event.start });
          }
        }
        slotStart = new Date(Math.max(event.end.getTime(), slotStart.getTime()));
      }

      // Agregar slot después del último evento si queda tiempo
      if (slotStart < workDayEnd) {
        availableSlots.push({ start: slotStart, end: workDayEnd });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableSlots;
}

// Función para obtener slots disponibles para un día específico
export async function getAvailableSlots(userId: string, date: string, otherUserEmail?: string): Promise<string[]> {
  try {
    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return ['Error: La fecha debe estar en formato YYYY-MM-DD'];
    }

    const startDate = new Date(date);
    if (isNaN(startDate.getTime())) {
      return ['Error: Fecha inválida'];
    }

    startDate.setHours(8, 0, 0); // Comenzar a las 8 AM
    const endDate = new Date(date);
    endDate.setHours(17, 0, 0); // Terminar a las 5 PM

    // Obtener el email del usuario actual
    const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1).execute();
    if (!currentUser || currentUser.length === 0) {
      return ['No se encontró la cuenta del usuario.'];
    }

    // Obtener eventos del usuario actual
    const userEvents = await getEvents(userId, startDate, endDate);
    if ('error' in userEvents) {
      return ['Error al obtener eventos del calendario.'];
    }

    let busySlots = userEvents.map(event => ({
      start: new Date(event.startTime),
      end: new Date(event.endTime),
    }));

    // Si se proporciona el email de otro usuario, obtener también sus eventos
    if (otherUserEmail) {
      const otherUser = await db.select().from(users).where(eq(users.email, otherUserEmail)).limit(1).execute();
      if (!otherUser || otherUser.length === 0) {
        return [`No se encontró el usuario con email ${otherUserEmail} en el sistema.`];
      }

      const otherUserEvents = await getEvents(otherUser[0].id, startDate, endDate);
      if ('error' in otherUserEvents) {
        return ['Error al obtener eventos del calendario.'];
      }

      busySlots = [...busySlots, ...otherUserEvents.map(event => ({
        start: new Date(event.startTime),
        end: new Date(event.endTime),
      }))];
    }

    // Encontrar slots disponibles
    const availableSlots = findAvailableSlots(startDate, endDate, busySlots);
    
    if (availableSlots.length === 0) {
      return ['No hay espacios disponibles en el día seleccionado.'];
    }

    // Seleccionar entre 3 y 5 slots distribuidos a lo largo del día
    const selectedSlots = selectDistributedSlots(availableSlots);
    
    return selectedSlots.map(slot => 
      `${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`
    );
  } catch (error) {
    console.error('Error getting available slots:', error);
    return ['Error al obtener los horarios disponibles.'];
  }
}

// Función auxiliar para seleccionar slots distribuidos
function selectDistributedSlots(slots: Array<{ start: Date; end: Date }>) {
  if (slots.length <= 5) return slots;

  // Dividir el día en segmentos para distribuir mejor los slots
  const morning = slots.filter(slot => slot.start.getHours() < 12);
  const afternoon = slots.filter(slot => slot.start.getHours() >= 12);

  const result = [];
  
  // Intentar obtener 2-3 slots de la mañana
  if (morning.length > 0) {
    result.push(morning[0]); // Primer slot de la mañana
    if (morning.length > 2) {
      result.push(morning[Math.floor(morning.length / 2)]); // Slot medio de la mañana
    }
    if (morning.length > 1) {
      result.push(morning[morning.length - 1]); // Último slot de la mañana
    }
  }

  // Intentar obtener 2 slots de la tarde
  if (afternoon.length > 0) {
    result.push(afternoon[0]); // Primer slot de la tarde
    if (afternoon.length > 1) {
      result.push(afternoon[afternoon.length - 1]); // Último slot de la tarde
    }
  }

  // Limitar a 5 slots
  return result.slice(0, 5);
}

// Modificar checkAvailability para manejar automáticamente el email del usuario actual
export async function checkAvailability(userId: string, otherUserEmail: string, date: string, time?: string): Promise<string[]> {
  try {
    // Si otherUserEmail es "me" o está vacío, obtener el email del usuario actual
    if (!otherUserEmail || otherUserEmail === 'me') {
      const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1).execute();
      if (!currentUser || currentUser.length === 0) {
        return ['No se encontró la cuenta del usuario.'];
      }
      if (!currentUser[0].email) {
        return ['Usuario no tiene email configurado.'];
      }
      otherUserEmail = currentUser[0].email;
    }

    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    if (!userAccount || userAccount.length === 0) {
      return ['No se encontró la cuenta del usuario.'];
    }

    const startDate = new Date(date);
    if (time) {
      const [hour, minute] = time.split(':').map(Number);
      startDate.setHours(hour, minute);
    }
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1); // Asumir una duración de 1 hora para la reunión

    const otherUser = await db.select().from(users).where(eq(users.email, otherUserEmail)).limit(1).execute();
    if (!otherUser || otherUser.length === 0) {
      return [`No se encontró el usuario con email ${otherUserEmail} en el sistema.`];
    }

    // Obtener eventos del otro usuario
    const otherUserEvents = await getEvents(otherUser[0].id, startDate, endDate);
    if ('error' in otherUserEvents) {
      return ['Error al obtener eventos del calendario.'];
    }

    const busySlots = otherUserEvents.map(event => ({
      start: new Date(event.startTime),
      end: new Date(event.endTime),
    }));

    // Obtener eventos del usuario actual
    const userEvents = await getEvents(userId, startDate, endDate);
    if ('error' in userEvents) {
      return ['Error al obtener eventos del calendario.'];
    }

    // Agregar eventos del usuario actual a los slots ocupados
    busySlots.push(...userEvents.map(event => ({
      start: new Date(event.startTime),
      end: new Date(event.endTime),
    })));

    // Encontrar slots disponibles
    const availableSlots = findAvailableSlots(startDate, endDate, busySlots);

    if (availableSlots.length === 0) {
      return ['No hay espacios disponibles en el día seleccionado.'];
    }

    return availableSlots.map(slot => `Disponible: ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`);
  } catch (error) {
    console.error('Error checking availability:', error);
    return ['Error al verificar la disponibilidad.'];
  }
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

    // Validaciones iniciales
    if (!eventId) {
      return { error: 'Se requiere el ID del evento' };
    }

    if (!summary && !description && !location && !startDateTime && !endDateTime && !attendeesEmails) {
      return { error: 'Se debe proporcionar al menos un campo para modificar' };
    }

    // Obtener el evento existente usando eventId
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

    // Parsear y actualizar fechas si se proporcionan nuevas
    if (startDateTime) {
      const parsedStart = parseDateTime(startDateTime);
      event.start = parsedStart.date ? { date: parsedStart.date } : { dateTime: parsedStart.dateTime, timeZone: parsedStart.timeZone };
    }

    if (endDateTime) {
      const parsedEnd = parseDateTime(endDateTime);
      event.end = parsedEnd.date ? { date: parsedEnd.date } : { dateTime: parsedEnd.dateTime, timeZone: parsedEnd.timeZone };
    }

    // Validar horario laboral
    if (startDateTime || endDateTime) {
      const startHour = DateTime.fromISO(event.start.dateTime || '').hour;
      const endHour = DateTime.fromISO(event.end.dateTime || '').hour;
      
      if (startHour < 8 || startHour > 17 || endHour < 8 || endHour > 17) {
        return { 
          error: 'El horario de la reunión debe estar dentro del horario laboral (8 AM - 5 PM)' 
        };
      }
    }

    // Verificar disponibilidad de asistentes
    if (attendeesEmails && attendeesEmails.length > 0) {
      for (const email of attendeesEmails) {
        const userEvents = await getEvents(userId, new Date(event.start.dateTime!), new Date(event.end.dateTime!));
        const otherUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!otherUser || otherUser.length === 0) {
          return {
            error: `No se encontró el usuario con email ${email} en el sistema.`
          };
        }

        const otherUserEvents = await getEvents(otherUser[0].id, new Date(event.start.dateTime!), new Date(event.end.dateTime!));

        if ('error' in userEvents || 'error' in otherUserEvents) {
          return { error: 'Error al obtener eventos del calendario' };
        }

        const hasConflict = [...userEvents, ...otherUserEvents].some(evt => {
          if (evt.id === eventId) return false; // Ignorar el evento actual
          const eventStart = new Date(evt.startTime);
          const eventEnd = new Date(evt.endTime);
          const proposedStart = new Date(event.start.dateTime!);
          const proposedEnd = new Date(event.end.dateTime!);
          
          return (
            (proposedStart >= eventStart && proposedStart < eventEnd) ||
            (proposedEnd > eventStart && proposedEnd <= eventEnd) ||
            (proposedStart <= eventStart && proposedEnd >= eventEnd)
          );
        });

        if (hasConflict) {
          return {
            error: `${email} tiene un conflicto de horario en el período seleccionado. Por favor, elige otro horario.`
          };
        }
      }
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
      if (error.message?.includes('invalid_grant')) {
        return { error: 'El token de acceso ha expirado. Por favor, vuelve a iniciar sesión.' };
      }
      if (error.message?.includes('Not Found')) {
        return { error: 'No se encontró el evento especificado.' };
      }
      if (error.message?.includes('forbidden')) {
        return { error: 'No tienes permisos para modificar este evento.' };
      }
    }
    
    return { error: 'Error al modificar el evento del calendario' };
  }
}

async function getEventIdByTitle(userId: string, eventTitle: string): Promise<string | null> {
  try {
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    
    if (!userAccount || !userAccount[0]?.refresh_token) {
      throw new Error('No se encontró el token de actualización para el usuario');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const events = await calendar.events.list({
      calendarId: 'primary',
      q: eventTitle, // Busca eventos que coincidan con el título
      singleEvents: true,
    });

    if (!events.data.items || events.data.items.length === 0) {
      return null;
    }

    // Retorna el ID del primer evento que coincida exactamente con el título
    const event = events.data.items.find(event => event.summary === eventTitle);
    return event?.id || null;
  } catch (error) {
    console.error('Error getting event ID:', error);
    return null;
  }
}

async function getEventIdsByTitle(userId: string, eventTitle: string): Promise<string[]> {
  try {
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    
    if (!userAccount || !userAccount[0]?.refresh_token) {
      throw new Error('No se encontró el token de actualización para el usuario');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const events = await calendar.events.list({
      calendarId: 'primary',
      q: eventTitle, // Busca eventos que coincidan con el título
      singleEvents: true,
    });

    if (!events.data.items || events.data.items.length === 0) {
      return [];
    }

    // Retorna todos los IDs de eventos que coincidan exactamente con el título
    return events.data.items
      .filter(event => event.summary === eventTitle)
      .map(event => event.id!);
  } catch (error) {
    console.error('Error getting event IDs:', error);
    return [];
  }
}

export async function modifyEventByTitle(userId: string, eventTitle: string, updates: { /* campos a actualizar */ }) {
  const eventIds = await getEventIdsByTitle(userId, eventTitle);
  
  if (eventIds.length === 0) {
    return { error: `No se encontraron eventos con el título "${eventTitle}".` };
  }

  if (eventIds.length > 1) {
    return { error: `Hay múltiples eventos con el título "${eventTitle}". Por favor, proporciona el ID del evento que deseas modificar.` };
  }

  const eventId = eventIds[0];
  return modifyEvent({ userId, eventId, ...updates });
}

// Add new function to send email to event creator
export async function sendDescriptionRequest(
  userId: string,
  eventId: string,
  creatorEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();
    
    if (!userAccount || !userAccount[0]?.refresh_token) {
      return { success: false, error: 'No se encontró el token de actualización para el usuario' };
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get user info for email signature
    const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1).execute();
    const userName = currentUser[0]?.name || 'Un participante';

    const emailContent = `
      Hola,
      
      Soy ${userName} y estoy invitado a una próxima reunión en tu calendario. Me gustaría conocer más detalles sobre los temas a tratar para poder prepararme adecuadamente.
      
      ¿Podrías por favor agregar una descripción al evento con los puntos principales que se discutirán?
      
      ¡Gracias!
      ${userName}
    `;

    const email = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      `To: ${creatorEmail}\n`,
      'Subject: Solicitud de descripción para próxima reunión\n',
      '\n',
      emailContent
    ].join('');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'Error al enviar el correo electrónico' };
  }
}

