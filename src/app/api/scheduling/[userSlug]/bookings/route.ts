import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  type CalendarEvent,
} from '@/lib/calendar';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const normalizeSlug = (slug: string) => slug.trim().toLowerCase();
const slugToName = (slug: string) => slug.replace(/[-_]+/g, ' ').trim();

const parseTimeMarker = (value: string) => {
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

const getClientIdentifier = (request: NextRequest) => {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
};

const ensureRateLimit = (_identifier: string) => true;

const findUser = async (slug: string) => {
  const normalized = normalizeSlug(slug);
  return prisma.user.findFirst({
    where: {
      OR: [
        { id: normalized },
        { email: { equals: normalized, mode: 'insensitive' } },
        { name: { equals: slugToName(normalized), mode: 'insensitive' } },
      ],
    },
    include: {
      company: { select: { name: true } },
    },
  });
};

const jsonWithCors = (body: unknown, status?: number) =>
  NextResponse.json(body, { status, headers: corsHeaders });

export async function POST(request: NextRequest) {
  const pathSegments = request.nextUrl.pathname.split('/');
  const userSlug = pathSegments[3];
  if (!userSlug) {
    return jsonWithCors({ error: 'Missing user slug' }, 400);
  }

  const user = await findUser(userSlug);
  if (!user) {
    return jsonWithCors({ error: 'User not found' }, 404);
  }

  const identifier = `${user.id}:${getClientIdentifier(request)}`;
  ensureRateLimit(identifier);

  let payload: {
    clientName?: string;
    clientEmail?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    clientPhone?: string;
    source?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonWithCors({ error: 'Invalid booking payload' }, 400);
  }

  const { clientName, clientEmail, startTime, endTime, notes, clientPhone, source } = payload;
  if (!clientName || !clientEmail || !startTime || !endTime) {
    return jsonWithCors({ error: 'Missing required booking fields' }, 400);
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
    return jsonWithCors({ error: 'Invalid start/end time' }, 400);
  }

  const hostTimeZone = user.timezone ?? 'America/Los_Angeles';
  const getHostTimeParts = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: hostTimeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(date);
    const hourStr = parts.find((part) => part.type === 'hour')?.value ?? '00';
    const minuteStr = parts.find((part) => part.type === 'minute')?.value ?? '00';
    const weekday = (parts.find((part) => part.type === 'weekday')?.value ?? '').slice(0, 3).toLowerCase();
    const weekdayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    return {
      hour: Number(hourStr),
      minute: Number(minuteStr),
      dayOfWeek: weekdayMap[weekday] ?? date.getUTCDay(),
    };
  };

  const startInfo = getHostTimeParts(startDate);
  const endInfo = getHostTimeParts(endDate);
  const dayOfWeek = startInfo.dayOfWeek;
  const startMinutes = startInfo.hour * 60 + startInfo.minute;
  const endMinutes = endInfo.hour * 60 + endInfo.minute;
  if (startMinutes === null || endMinutes === null) {
    return jsonWithCors({ error: 'Invalid time format' }, 400);
  }

  const availability = await prisma.availability.findFirst({
    where: { userId: user.id, dayOfWeek, isActive: true },
  });
  if (!availability) {
    return jsonWithCors({ error: 'No availability defined for the requested day' }, 400);
  }
  const availableStart = parseTimeMarker(availability.startTime);
  const availableEnd = parseTimeMarker(availability.endTime);
  if (
    availableStart === null ||
    availableEnd === null ||
    startMinutes < availableStart ||
    endMinutes > availableEnd
  ) {
    return jsonWithCors({ error: 'Requested slot falls outside availability' }, 400);
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      userId: user.id,
      OR: [
        { startTime: { lt: endDate }, endTime: { gt: startDate } },
      ],
    },
  });
  if (conflict) {
    return jsonWithCors({ error: 'Requested slot already booked' }, 409);
  }

  const normalizedPhone = clientPhone?.trim() || null;

  let clientId: string | null = null;
  if (clientEmail && user.companyId) {
    const companyId = user.companyId;
    const existingClient = await prisma.client.findFirst({
      where: {
        companyId,
        email: { equals: clientEmail.trim(), mode: 'insensitive' },
      },
    });
    if (existingClient) {
      clientId = existingClient.id;
      if (normalizedPhone && normalizedPhone !== existingClient.phone) {
        await prisma.client.update({
          where: { id: existingClient.id },
          data: { phone: normalizedPhone },
        });
      }
    } else {
      // Create a Lead instead of a Client if not found
      const resolvedSource = source?.trim() || 'Booking Form';
      await prisma.lead.create({
        data: {
          companyId,
          assignedToId: user.id,
          email: clientEmail.trim(),
          name: clientName.trim(),
          companyName: clientName.trim(),
          phone: normalizedPhone,
          source: resolvedSource,
          status: 'new',
          notes: notes?.trim() || null,
        },
      });
      // Optionally: clientId = null; (no client yet)
    }
  }

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: normalizedPhone,
      startTime: startDate,
      endTime: endDate,
      notes: notes?.trim() || null,
      status: 'CONFIRMED',
    },
  });

  const timeZone = user.timezone || 'America/Los_Angeles';
  const formattedStart = startDate.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
  const formattedEnd = endDate.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
  const companyName = user.companyName || user.company?.name || 'ClientWave';

  // Create Google Calendar event if host has Google Calendar connected
  try {
    const googleEventId = await createGoogleCalendarEvent(user.id, {
      summary: `Session with ${clientName.trim()}`,
      description: notes?.trim() || `Meeting with ${clientName.trim()}`,
      location: 'Online / Phone',
      start: startDate,
      end: endDate,
      attendees: [clientEmail.trim()],
    });

    if (googleEventId) {
      console.log(`✅ Google Calendar event created: ${googleEventId}`);
    }
  } catch (error) {
    // Don't fail the booking if calendar creation fails
    console.error('Failed to create Google Calendar event:', error);
  }

  // Generate calendar links
  const calendarEvent: CalendarEvent = {
    title: `Session with ${user.name || companyName}`,
    description: notes?.trim() || `Meeting with ${user.name || companyName}`,
    location: 'Online / Phone',
    startTime: startDate,
    endTime: endDate,
    attendeeEmail: clientEmail.trim(),
    attendeeName: clientName.trim(),
  };

  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const googleCalUrl = generateGoogleCalendarUrl(calendarEvent);
  const outlookCalUrl = generateOutlookCalendarUrl(calendarEvent);
  const icsUrl = `${appBase}/api/calendar/ics?bookingId=${booking.id}`;

  if (clientEmail) {
    await sendEmail({
      from: process.env.RESEND_FROM || 'invoices@858webdesign.com',
      to: [clientEmail.trim()],
      subject: `Booking confirmed with ${companyName}`,
      html: `
        <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
          <h1 style="margin-bottom:12px; color:#111;">Booking confirmed</h1>
          <p style="margin-bottom:6px;">Hi ${clientName.split(' ')[0] || clientName},</p>
          <p style="margin-bottom:12px;">Your session with ${user.name || companyName} is booked for ${formattedDate} from ${formattedStart} - ${formattedEnd} (${timeZone}).</p>
          
          <div style="margin: 24px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 16px 0; font-weight: 600; color: #1f2937; font-size: 16px;">📅 Add to Your Calendar</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">Don't forget! Click a button below to save this to your calendar.</p>
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
              <tr>
                <td style="padding-bottom: 12px;">
                  <a href="${googleCalUrl}" target="_blank" style="display: block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; min-width: 240px; text-align: center;">
                    🗓️ Add to Google Calendar
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px;">
                  <a href="${outlookCalUrl}" target="_blank" style="display: block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; min-width: 240px; text-align: center;">
                    📅 Add to Outlook
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <a href="${icsUrl}" download style="display: block; padding: 12px 24px; background-color: transparent; color: #4f46e5; text-decoration: none; border-radius: 6px; font-weight: 500; min-width: 240px; text-align: center; border: 2px solid #4f46e5;">
                    🍎 Download for Apple Calendar
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="margin:0;">If you need to reschedule, reply to this email.</p>
        </div>
      `,
    });
  }

  const phoneDisplay = normalizedPhone ?? '—';

  if (user.email) {
    await sendEmail({
      from: process.env.RESEND_FROM || 'invoices@858webdesign.com',
      to: [user.email],
      subject: `New booking: ${clientName}`,
      html: `
        <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
          <h1 style="margin-bottom:12px; color:#111;">New booking received</h1>
          <p style="margin-bottom:4px;">Client: ${clientName}</p>
          <p style="margin-bottom:4px;">Email: ${clientEmail}</p>
          <p style="margin-bottom:4px;">Phone: ${phoneDisplay}</p>
          <p style="margin-bottom:12px;">When: ${formattedDate} from ${formattedStart} - ${formattedEnd} (${timeZone})</p>
          <p style="margin:0;">Notes: ${notes || 'None'}</p>
        </div>
      `,
    });
  }

  const response = NextResponse.json(
    {
      success: true,
      bookingId: booking.id,
      clientId,
      clientPhone: normalizedPhone,
    },
    { headers: corsHeaders },
  );
  return response;
}
