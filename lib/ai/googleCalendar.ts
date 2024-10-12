import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { accounts } from '../db/schema/schemas';
import { eq } from 'drizzle-orm';
import { db } from '../db';

function createOAuth2Client() {
    return new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
  }

export async function createEvent({ summary, description, location, startDateTime, endDateTime, userId, attendeesEmails, calendarId, eventType }: {
  summary: string,
  description: string,
  location: string,
  startDateTime: string,
  endDateTime: string,
  userId: string,
  attendeesEmails: string[],
  calendarId: string,
  eventType: string
}) {
  const userAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1).execute();

  if (!userAccount || !userAccount[0]?.refresh_token) {
    throw new Error('Refresh token not found for the user');
  }

  const oauth2Client = createOAuth2Client();

  try {
    oauth2Client.setCredentials({
      refresh_token: userAccount[0].refresh_token,
      access_token: userAccount[0].access_token,
      expiry_date: userAccount[0].expires_at,
      token_type: userAccount[0].token_type,
      scope: userAccount[0].scope || '',
      id_token: userAccount[0].id_token || '',
    });

    const calendar = google.calendar({ version: 'v3'});

    const event = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      attendees: attendeesEmails.map(email => ({ email })),
      eventType: eventType,
    };

    const res = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendNotifications: true,
      sendUpdates: 'all',
    });

    return [{
        name: summary,
        eventLink: res.data.htmlLink,
        startTime: startDateTime,
        endTime: endDateTime,
        attendees: attendeesEmails,
        eventType: eventType,
      }];
    } catch (error) {
      console.error('Error creating event:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: unknown } } };
        if (axiosError.response?.data?.error) {
          console.error('Detailed error:', axiosError.response.data.error);
        }
      }
      throw error;
    }
  }