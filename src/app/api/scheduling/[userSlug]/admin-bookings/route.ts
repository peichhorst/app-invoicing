import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from '@/lib/email';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEventsByBookingId,
  deleteGoogleCalendarEventsByMatch,
} from '@/lib/google-calendar';

const normalizeSlug = (slug: string) => slug.trim().toLowerCase();
const slugToName = (slug: string) => slug.replace(/[-_]+/g, " ").trim();

const findUser = async (slug: string) => {
  const normalized = normalizeSlug(slug);
  const baseWhere = {
    OR: [
      { id: normalized },
      { email: { equals: normalized, mode: "insensitive" as const } },
      { name: { equals: slugToName(normalized), mode: "insensitive" as const } },
    ],
  };

  return (
    (await prisma.user.findFirst({
      where: {
        ...baseWhere,
        availabilities: { some: { isActive: true } },
      },
    })) ??
    (await prisma.user.findFirst({
      where: baseWhere,
    }))
  );
};

const AUTHORIZED_ROLES = new Set(["ADMIN", "OWNER", "SUPERADMIN"]);
const CANCELLED_STATUSES = ['CANCELLED', 'CANCELED', 'cancelled', 'canceled'] as const;

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


export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[segments.length - 2];
  if (!slug) {
    return NextResponse.json({ error: "Missing user slug" }, { status: 400 });
  }

  const user = await findUser(slug);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isOwner = currentUser.id === user.id;
  const hasRole = AUTHORIZED_ROLES.has(currentUser.role);
  if (!isOwner && !hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      notes: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ bookings });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pathname, searchParams } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 2];
  const bookingId = searchParams.get('bookingId')?.trim();
  const hardDelete = searchParams.get('hard') === 'true' || searchParams.get('mode') === 'delete';

  if (!slug) {
    return NextResponse.json({ error: 'Missing user slug' }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const user = await findUser(slug);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const isOwner = currentUser.id === user.id;
  const hasRole = AUTHORIZED_ROLES.has(currentUser.role);
  if (!isOwner && !hasRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
      startTime: true,
      endTime: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      notes: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (!hardDelete && (booking.status === 'CANCELLED' || booking.status === 'CANCELED')) {
    return NextResponse.json({ booking });
  }

  if (hardDelete) {
    try {
      let deletedEvents = await deleteGoogleCalendarEventsByBookingId(user.id, booking.id, 'all');
      if (deletedEvents === 0) {
        deletedEvents = await deleteGoogleCalendarEventsByMatch(
          user.id,
          {
            start: new Date(booking.startTime),
            end: new Date(booking.endTime),
            clientEmail: booking.clientEmail,
            clientName: booking.clientName,
          },
          'all',
        );
      }
      await prisma.booking.delete({ where: { id: booking.id } });
      return NextResponse.json({ deleted: true, bookingId: booking.id, deletedGoogleEvents: deletedEvents });
    } catch (error) {
      console.error('Hard delete failed for booking:', error);
      return NextResponse.json(
        { error: 'Failed to fully delete booking and linked calendar events.' },
        { status: 500 },
      );
    }
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED' },
    select: {
      id: true,
      status: true,
    },
  });

  const timeZone = user.timezone || 'America/Los_Angeles';
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
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

  // Best-effort Google cancellation and attendee updates.
  try {
    let deletedEvents = await deleteGoogleCalendarEventsByBookingId(user.id, booking.id, 'all');
    if (deletedEvents === 0) {
      deletedEvents = await deleteGoogleCalendarEventsByMatch(
        user.id,
        {
          start: startDate,
          end: endDate,
          clientEmail: booking.clientEmail,
          clientName: booking.clientName,
        },
        'all',
      );
    }
    if (deletedEvents > 0) {
      console.log('Google calendar events deleted for cancellation', {
        bookingId: booking.id,
        deletedEvents,
      });
    }
  } catch (error) {
    console.error('Failed to delete Google Calendar event(s) during cancellation:', error);
  }

  const companyName = user.companyName || 'ClientWave';
  const fromAddress = process.env.RESEND_FROM || 'no-reply@clientwave.app';

  // Notify client about cancellation.
  if (booking.clientEmail) {
    try {
      await sendEmail({
        from: fromAddress,
        to: [booking.clientEmail.trim()],
        subject: `Booking canceled with ${companyName}`,
        html: `
          <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
            <h1 style="margin-bottom:12px; color:#111;">Booking canceled</h1>
            <p style="margin-bottom:6px;">Hi ${booking.clientName.split(' ')[0] || booking.clientName},</p>
            <p style="margin-bottom:12px;">Your session on ${formattedDate} from ${formattedStart} - ${formattedEnd} (${timeZone}) has been canceled.</p>
            <p style="margin:0;">If you'd like to reschedule, please book a new time from the scheduling link.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send booking cancellation email to client:', error);
    }
  }

  // Notify booking owner.
  if (user.email) {
    try {
      await sendEmail({
        from: fromAddress,
        to: [user.email],
        subject: `Booking canceled: ${booking.clientName}`,
        html: `
          <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
            <h1 style="margin-bottom:12px; color:#111;">Booking canceled</h1>
            <p style="margin-bottom:4px;">Client: ${booking.clientName}</p>
            <p style="margin-bottom:4px;">Email: ${booking.clientEmail}</p>
            <p style="margin-bottom:4px;">Phone: ${booking.clientPhone || '-'}</p>
            <p style="margin-bottom:12px;">When: ${formattedDate} from ${formattedStart} - ${formattedEnd} (${timeZone})</p>
            <p style="margin:0;">Notes: ${booking.notes || 'None'}</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send booking cancellation email to owner:', error);
    }
  }

  return NextResponse.json({ booking: updated });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 2];
  if (!slug) {
    return NextResponse.json({ error: 'Missing user slug' }, { status: 400 });
  }

  const user = await findUser(slug);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const isOwner = currentUser.id === user.id;
  const hasRole = AUTHORIZED_ROLES.has(currentUser.role);
  if (!isOwner && !hasRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: { bookingId?: string; startTime?: string; endTime?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const bookingId = payload.bookingId?.trim();
  const startTime = payload.startTime?.trim();
  const endTime = payload.endTime?.trim();
  if (!bookingId || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);
  if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime()) || newStart >= newEnd) {
    return NextResponse.json({ error: 'Invalid start/end time' }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
      startTime: true,
      endTime: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      notes: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
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

  const startInfo = getHostTimeParts(newStart);
  const endInfo = getHostTimeParts(newEnd);
  const dayOfWeek = startInfo.dayOfWeek;
  const startMinutes = startInfo.hour * 60 + startInfo.minute;
  const endMinutes = endInfo.hour * 60 + endInfo.minute;

  const availability = await prisma.availability.findFirst({
    where: { userId: user.id, dayOfWeek, isActive: true },
  });
  if (!availability) {
    return NextResponse.json({ error: 'No availability defined for the requested day' }, { status: 400 });
  }
  const availableStart = parseTimeMarker(availability.startTime);
  const availableEnd = parseTimeMarker(availability.endTime);
  const duration = Number.isFinite(availability.duration) && availability.duration > 0 ? availability.duration : 30;
  const buffer = Number.isFinite(availability.buffer) && availability.buffer >= 0 ? availability.buffer : 0;
  const requestedDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
  const slotStep = duration + buffer;
  const alignsToGrid = availableStart !== null ? (startMinutes - availableStart) % slotStep === 0 : false;

  if (startInfo.dayOfWeek !== endInfo.dayOfWeek) {
    return NextResponse.json({ error: 'Reschedule cannot span multiple days' }, { status: 400 });
  }
  if (
    availableStart === null ||
    availableEnd === null ||
    startMinutes < availableStart ||
    endMinutes > availableEnd
  ) {
    return NextResponse.json({ error: 'Requested slot falls outside availability' }, { status: 400 });
  }
  if (requestedDuration !== duration) {
    return NextResponse.json(
      { error: `Requested slot must be ${duration} minutes to match your availability` },
      { status: 400 },
    );
  }
  if (endMinutes !== startMinutes + duration) {
    return NextResponse.json({ error: 'Requested slot does not match configured duration' }, { status: 400 });
  }
  if (!alignsToGrid) {
    return NextResponse.json({ error: `Requested slot must align with your ${duration}-minute slots` }, { status: 400 });
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      userId: user.id,
      id: { not: booking.id },
      status: { notIn: [...CANCELLED_STATUSES] },
      OR: [{ startTime: { lt: newEnd }, endTime: { gt: newStart } }],
    },
    select: { id: true },
  });
  if (conflict) {
    return NextResponse.json({ error: 'Requested slot already booked' }, { status: 409 });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      startTime: newStart,
      endTime: newEnd,
      status: 'CONFIRMED',
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      notes: true,
    },
  });

  // Best-effort Google reschedule: delete old event(s), create replacement, notify attendees.
  try {
    let deletedEvents = await deleteGoogleCalendarEventsByBookingId(user.id, booking.id, 'all');
    if (deletedEvents === 0) {
      deletedEvents = await deleteGoogleCalendarEventsByMatch(
        user.id,
        {
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          clientEmail: booking.clientEmail,
          clientName: booking.clientName,
        },
        'all',
      );
    }

    await createGoogleCalendarEvent(user.id, {
      summary: `Session with ${booking.clientName}`,
      description: booking.notes?.trim() || `Meeting with ${booking.clientName}`,
      location: 'Online / Phone',
      start: newStart,
      end: newEnd,
      attendees: [booking.clientEmail.trim()],
      privateExtendedProperties: { bookingId: booking.id },
    });
  } catch (error) {
    console.error('Failed to reschedule Google Calendar event(s):', error);
  }

  const companyName = user.companyName || 'ClientWave';
  const fromAddress = process.env.RESEND_FROM || 'no-reply@clientwave.app';
  const timeZone = hostTimeZone;
  const oldStart = new Date(booking.startTime);
  const oldEnd = new Date(booking.endTime);
  const oldDateLabel = oldStart.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
  const oldStartLabel = oldStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
  const oldEndLabel = oldEnd.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
  const newDateLabel = newStart.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
  const newStartLabel = newStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
  const newEndLabel = newEnd.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });

  if (booking.clientEmail) {
    try {
      await sendEmail({
        from: fromAddress,
        to: [booking.clientEmail.trim()],
        subject: `Booking rescheduled with ${companyName}`,
        html: `
          <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
            <h1 style="margin-bottom:12px; color:#111;">Booking rescheduled</h1>
            <p style="margin-bottom:6px;">Hi ${booking.clientName.split(' ')[0] || booking.clientName},</p>
            <p style="margin-bottom:8px;">Your session was moved:</p>
            <p style="margin:0 0 4px 0;"><strong>Previous:</strong> ${oldDateLabel} from ${oldStartLabel} - ${oldEndLabel} (${timeZone})</p>
            <p style="margin:0 0 12px 0;"><strong>New:</strong> ${newDateLabel} from ${newStartLabel} - ${newEndLabel} (${timeZone})</p>
            <p style="margin:0;">A calendar update was sent where available.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send booking rescheduled email to client:', error);
    }
  }

  if (user.email) {
    try {
      await sendEmail({
        from: fromAddress,
        to: [user.email],
        subject: `Booking rescheduled: ${booking.clientName}`,
        html: `
          <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
            <h1 style="margin-bottom:12px; color:#111;">Booking rescheduled</h1>
            <p style="margin-bottom:4px;">Client: ${booking.clientName}</p>
            <p style="margin-bottom:4px;">Email: ${booking.clientEmail}</p>
            <p style="margin-bottom:4px;">Phone: ${booking.clientPhone || '-'}</p>
            <p style="margin-bottom:4px;"><strong>Previous:</strong> ${oldDateLabel} ${oldStartLabel} - ${oldEndLabel} (${timeZone})</p>
            <p style="margin-bottom:12px;"><strong>New:</strong> ${newDateLabel} ${newStartLabel} - ${newEndLabel} (${timeZone})</p>
            <p style="margin:0;">Notes: ${booking.notes || 'None'}</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send booking rescheduled email to owner:', error);
    }
  }

  return NextResponse.json({ booking: updated });
}
