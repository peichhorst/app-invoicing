/**
 * Google Calendar OAuth utilities
 * Handles token management, refresh, and API calls
 */

import prisma from '@/lib/prisma';
import crypto from 'crypto';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events', // Create/edit events
  'https://www.googleapis.com/auth/calendar.readonly', // Read calendar for free/busy
].join(' ');

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3000/api/auth/google/calendar/callback';
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`
  : 'http://localhost:3000/api/webhooks/google-calendar';

// Simple encryption for storing refresh tokens
// In production, use a proper encryption library like @47ng/cloak
const ENCRYPTION_KEY = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || 'your-32-char-secret-key-change-me!';

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptToken(encrypted: string): string {
  const [ivHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent screen to always get refresh token
    state: userId, // Pass user ID to identify who's connecting
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  email?: string;
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const tokens = await response.json();

  // Get user's email from Google
  if (tokens.access_token) {
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();
      tokens.email = userInfo.email;
    } catch (error) {
      console.error('Failed to fetch user email:', error);
    }
  }

  return tokens;
}

/**
 * Save Google Calendar tokens to database
 */
export async function saveGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  email?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const encryptedRefreshToken = encryptToken(refreshToken);

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleCalendarConnected: true,
      googleAccessToken: accessToken,
      googleRefreshToken: encryptedRefreshToken,
      googleTokenExpiresAt: expiresAt,
      googleCalendarEmail: email || undefined,
    },
  });
}

/**
 * Refresh the access token using refresh token
 */
export async function refreshGoogleAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  });

  if (!user?.googleRefreshToken) {
    throw new Error('No refresh token found for user');
  }

  const refreshToken = decryptToken(user.googleRefreshToken);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Update access token in database
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token,
      googleTokenExpiresAt: expiresAt,
    },
  });

  return tokens.access_token;
}

/**
 * Get valid access token (refreshes if expired)
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleTokenExpiresAt: true,
      googleCalendarConnected: true,
    },
  });

  if (!user?.googleCalendarConnected || !user.googleAccessToken) {
    return null;
  }

  // Check if token is expired or will expire in next 5 minutes
  const now = new Date();
  const expiresAt = user.googleTokenExpiresAt || now;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt < fiveMinutesFromNow) {
    // Token expired or expiring soon, refresh it
    return await refreshGoogleAccessToken(userId);
  }

  return user.googleAccessToken;
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleCalendarConnected: false,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
      googleCalendarEmail: null,
    },
  });
}

/**
 * Create a calendar event
 */
export async function createGoogleCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    attendees?: string[];
  }
): Promise<string | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error('User not connected to Google Calendar');
  }

  const calendarEvent = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.start.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: 'UTC',
    },
    attendees: event.attendees?.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `${userId}-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(calendarEvent),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to create calendar event:', error);
    return null;
  }

  const result = await response.json();
  return result.id; // Return the Google Calendar event ID
}

/**
 * Get busy time slots from Google Calendar
 */
export async function getGoogleCalendarBusyTimes(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return []; // If not connected, return no busy times
  }

  const requestBody = {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    items: [{ id: 'primary' }],
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to fetch free/busy data:', error);
    return []; // Return empty on error so availability still works
  }

  const data = await response.json();
  const primaryCalendar = data.calendars?.primary;
  
  if (!primaryCalendar?.busy) {
    return [];
  }

  // Convert busy periods to Date objects
  return primaryCalendar.busy.map((period: { start: string; end: string }) => ({
    start: new Date(period.start),
    end: new Date(period.end),
  }));
}

/**
 * Set up a watch channel for Google Calendar push notifications
 */
export async function setupGoogleCalendarWatch(userId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    console.error('Cannot setup watch: User not connected to Google Calendar');
    return false;
  }

  // Generate a unique channel ID
  const channelId = `${userId}-${Date.now()}`;
  const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days (max allowed by Google)

  const watchRequest = {
    id: channelId,
    type: 'web_hook',
    address: WEBHOOK_URL,
    token: userId, // Optional token to verify requests
    expiration: expiration.toString(),
  };

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(watchRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to setup Google Calendar watch:', error);
      return false;
    }

    const data = await response.json();
    
    // Save watch channel info to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleWatchChannelId: data.id,
        googleWatchResourceId: data.resourceId,
        googleWatchExpiration: new Date(parseInt(data.expiration)),
      },
    });

    console.log('✅ Google Calendar watch setup successful:', {
      userId,
      channelId: data.id,
      resourceId: data.resourceId,
      expiration: new Date(parseInt(data.expiration)).toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Error setting up Google Calendar watch:', error);
    return false;
  }
}

/**
 * Stop watching a Google Calendar (cleanup)
 */
export async function stopGoogleCalendarWatch(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleWatchChannelId: true,
      googleWatchResourceId: true,
    },
  });

  if (!user?.googleAccessToken || !user.googleWatchChannelId || !user.googleWatchResourceId) {
    return false; // Nothing to stop
  }

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/channels/stop', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: user.googleWatchChannelId,
        resourceId: user.googleWatchResourceId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to stop Google Calendar watch:', error);
      return false;
    }

    // Clear watch info from database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleWatchChannelId: null,
        googleWatchResourceId: null,
        googleWatchExpiration: null,
      },
    });

    console.log('✅ Google Calendar watch stopped for user:', userId);
    return true;
  } catch (error) {
    console.error('Error stopping Google Calendar watch:', error);
    return false;
  }
}

/**
 * Check if watch needs renewal and renew if necessary
 */
export async function renewGoogleCalendarWatchIfNeeded(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleCalendarConnected: true,
      googleWatchExpiration: true,
    },
  });

  if (!user?.googleCalendarConnected) {
    return; // Not connected
  }

  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Renew if expiring within 24 hours
  if (!user.googleWatchExpiration || user.googleWatchExpiration < oneDayFromNow) {
    console.log('🔄 Renewing Google Calendar watch for user:', userId);
    await stopGoogleCalendarWatch(userId);
    await setupGoogleCalendarWatch(userId);
  }
}
