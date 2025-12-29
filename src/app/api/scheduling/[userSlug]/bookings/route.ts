import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

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

export async function POST(request: NextRequest) {
  const pathSegments = request.nextUrl.pathname.split('/');
  const userSlug = pathSegments[3];
  if (!userSlug) {
    return NextResponse.json({ error: 'Missing user slug' }, { status: 400 });
  }

  const user = await findUser(userSlug);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const identifier = `${user.id}:${getClientIdentifier(request)}`;
  ensureRateLimit(identifier);

  let payload: {
    clientName?: string;
    clientEmail?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid booking payload' }, { status: 400 });
  }

  const { clientName, clientEmail, startTime, endTime, notes } = payload;
  if (!clientName || !clientEmail || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
    return NextResponse.json({ error: 'Invalid start/end time' }, { status: 400 });
  }

  const dayOfWeek = startDate.getDay();
  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
  if (startMinutes === null || endMinutes === null) {
    return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
  }

  const availability = await prisma.availability.findFirst({
    where: { userId: user.id, dayOfWeek, isActive: true },
  });
  if (!availability) {
    return NextResponse.json({ error: 'No availability defined for the requested day' }, { status: 400 });
  }
  const availableStart = parseTimeMarker(availability.startTime);
  const availableEnd = parseTimeMarker(availability.endTime);
  if (
    availableStart === null ||
    availableEnd === null ||
    startMinutes < availableStart ||
    endMinutes > availableEnd
  ) {
    return NextResponse.json({ error: 'Requested slot falls outside availability' }, { status: 400 });
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
    return NextResponse.json({ error: 'Requested slot already booked' }, { status: 409 });
  }

  let clientId: string | null = null;
  if (clientEmail) {
    const companyId = user.companyId ?? null;
    if (companyId) {
      const existingClient = await prisma.client.findFirst({
        where: {
          companyId,
          email: { equals: clientEmail.trim(), mode: 'insensitive' },
        },
      });
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const createdClient = await prisma.client.create({
          data: {
            companyId,
            email: clientEmail.trim(),
            contactName: clientName.trim(),
            companyName: clientName.trim(),
          },
        });
        clientId = createdClient.id;
      }
    }
  }

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      startTime: startDate,
      endTime: endDate,
      notes: notes?.trim() || null,
      status: 'CONFIRMED',
    },
  });

  const formattedStart = startDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const formattedEnd = endDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const companyName = user.companyName || user.company?.name || 'ClientWave';

  if (clientEmail) {
    await sendEmail({
      from: process.env.RESEND_FROM || 'invoices@858webdesign.com',
      to: [clientEmail.trim()],
      subject: `Booking confirmed with ${companyName}`,
      html: `
        <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
          <h1 style="margin-bottom:12px; color:#111;">Booking confirmed</h1>
          <p style="margin-bottom:6px;">Hi ${clientName.split(' ')[0] || clientName},</p>
          <p style="margin-bottom:12px;">Your session with ${user.name || companyName} is booked for ${formattedDate} from ${formattedStart} - ${formattedEnd}.</p>
          <p style="margin:0;">If you need to reschedule, reply to this email.</p>
        </div>
      `,
    });
  }

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
          <p style="margin-bottom:12px;">When: ${formattedDate} from ${formattedStart} - ${formattedEnd}</p>
          <p style="margin:0;">Notes: ${notes || 'None'}</p>
        </div>
      `,
    });
  }

  return NextResponse.json({ success: true, bookingId: booking.id, clientId });
}
