import BookingFormClient from './BookingFormClient';
import prisma from '@/lib/prisma';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Slot = {
  label: string;
  start: string;
  end: string;
};

type DayAvailability = {
  dayOfWeek: number;
  dayLabel: string;
  slots: Slot[];
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const formatTime = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatTime12 = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hrs >= 12 ? 'PM' : 'AM';
  const normalizedHour = hrs % 12 === 0 ? 12 : hrs % 12;
  return `${normalizedHour}:${String(mins).padStart(2, '0')} ${suffix}`;
};

const buildSlots = (startTime: string, endTime: string, duration: number, buffer: number): Slot[] => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null || start >= end) {
    return [];
  }
  const normalizedDuration = Number.isFinite(duration) && duration > 0 ? duration : 30;
  const normalizedBuffer = Number.isFinite(buffer) && buffer >= 0 ? buffer : 0;
  const slots: Slot[] = [];
  let cursor = start;
  while (cursor + normalizedDuration <= end) {
    slots.push({
      start: formatTime(cursor),
      end: formatTime(cursor + normalizedDuration),
      label: `${formatTime12(cursor)} - ${formatTime12(cursor + normalizedDuration)}`,
    });
    cursor += normalizedDuration + normalizedBuffer;
  }
  return slots;
};

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const slugToName = (slug: string) => slug.replace(/[-_]+/g, ' ').trim();

async function loadAvailability(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const nameCandidate = slugToName(normalizedSlug);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: normalizedSlug },
        { email: normalizedSlug },
        { name: { equals: nameCandidate, mode: 'insensitive' } },
      ],
    },
    select: { id: true, timezone: true },
  });
  if (!user) {
    return null;
  }
  const availability = await prisma.availability.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { dayOfWeek: 'asc' },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      duration: true,
      buffer: true,
    },
  });

  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + 30);

  const bookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      startTime: {
        gte: now,
        lt: future,
      },
    },
    select: {
      startTime: true,
    },
  });

  const hostTimeZone = user.timezone ?? 'America/Los_Angeles';
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: hostTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: hostTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: hostTimeZone,
    weekday: 'short',
  });
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const bookedSlots = bookings
    .map((booking) => {
      const start = booking.startTime;
      const date = dateFormatter.format(start);
      const localStart = timeFormatter.format(start);
      const weekday = weekdayFormatter.format(start);
      const dayOfWeek = weekdayMap[weekday as keyof typeof weekdayMap] ?? start.getUTCDay();
      return {
        date,
        dayOfWeek,
        startTime: start.toISOString(),
        localTime: localStart,
      };
    })
    .filter(
      (value, index, self) =>
        index ===
        self.findIndex((t) => t.dayOfWeek === value.dayOfWeek && t.startTime === value.startTime && t.date === value.date)
    )
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });

  return { availability, bookedSlots, hostTimezone: hostTimeZone, ownerId: user.id };
}

export default async function BookingPage({ params }: { params: Promise<{ slug?: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug?.trim();
  if (!slug) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
          <p>Booking link missing. Please check the invitation link and try again.</p>
        </div>
      </div>
    );
  }

  const availabilityPayload = await loadAvailability(slug);
  if (!availabilityPayload) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
          <p>Availability for this user is not available.</p>
        </div>
      </div>
    );
  }

  const { availability: availabilityDataRaw, bookedSlots, hostTimezone, ownerId } = availabilityPayload;
  const availabilityData: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    duration: number;
    buffer: number;
  }> = availabilityDataRaw;

  const days: DayAvailability[] = availabilityData
    .map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      dayLabel: dayNames[entry.dayOfWeek] || 'Day',
      slots: buildSlots(entry.startTime, entry.endTime, entry.duration, entry.buffer),
    }))
    .filter((day) => day.slots.length > 0);

  const normalizedSlug = normalizeSlug(slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const bookingLink = `${baseUrl}/book/${normalizedSlug}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Book a session</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Schedule time with our team</h1>
          <p className="text-sm text-zinc-600">
            Browse available time slots and request a meeting. Confirmation emails are sent to you and the owner automatically.
          </p>
          <p className="text-xs text-zinc-500">
            Public booking link: <span className="font-mono text-[11px] text-blue-600">{bookingLink}</span>
          </p>
        </div>
        <BookingFormClient
          slug={slug}
          days={days}
          bookingLink={bookingLink}
          bookedSlots={bookedSlots}
          hostTimezone={hostTimezone}
          ownerId={ownerId}
        />
      </div>
    </div>
  );
}
