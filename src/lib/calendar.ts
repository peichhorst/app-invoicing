// Calendar utility functions for generating calendar links and ICS files

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
  attendeeName?: string;
}

/**
 * Format date to ISO string format for calendar URLs
 * Example: 20260103T140000Z
 */
function formatDateForCalendar(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const startIso = formatDateForCalendar(event.startTime);
  const endIso = formatDateForCalendar(event.endTime);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startIso}/${endIso}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  if (event.attendeeEmail) {
    params.append('add', event.attendeeEmail);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook/Office 365 Calendar URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const startIso = event.startTime.toISOString();
  const endIso = event.endTime.toISOString();
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startIso,
    enddt: endIso,
  });

  if (event.description) {
    params.append('body', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate ICS file content (for Apple Calendar, Outlook desktop, etc.)
 */
export function generateICSFile(event: CalendarEvent): string {
  const startIso = formatDateForCalendar(event.startTime);
  const endIso = formatDateForCalendar(event.endTime);
  const now = formatDateForCalendar(new Date());
  
  // Generate a unique ID for the event
  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@clientwave.app`;
  
  // Escape special characters in ICS format
  const escapeICS = (str: string) => str.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClientWave//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  if (event.attendeeEmail && event.attendeeName) {
    lines.push(`ATTENDEE;CN=${escapeICS(event.attendeeName)}:mailto:${event.attendeeEmail}`);
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('SEQUENCE:0');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate Yahoo Calendar URL
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  const startIso = formatDateForCalendar(event.startTime);
  const endIso = formatDateForCalendar(event.endTime);
  
  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: startIso,
    et: endIso,
  });

  if (event.description) {
    params.append('desc', event.description);
  }

  if (event.location) {
    params.append('in_loc', event.location);
  }

  return `https://calendar.yahoo.com/?${params.toString()}`;
}
