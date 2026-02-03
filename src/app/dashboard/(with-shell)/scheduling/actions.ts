"use server";

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { daysOfWeek, normalizeSlug } from './helpers';

export type AvailabilityEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration: number;
  buffer: number;
  isActive: boolean;
};

export async function getAvailabilityForUser(userId: string) {
  return prisma.availability.findMany({
    where: { userId },
    orderBy: { dayOfWeek: 'asc' },
  });
}

export async function postAvailability(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const persisted = await prisma.availability.findMany({
    where: { userId: user.id },
  });

  const deletes: number[] = [];
  const updates: AvailabilityEntry[] = [];

  for (const { value } of daysOfWeek) {
    const active = formData.get(`active-${value}`) === 'on';
    const startTime = (formData.get(`start-${value}`) as string | null)?.trim();
    const endTime = (formData.get(`end-${value}`) as string | null)?.trim();
    const duration = Number(formData.get(`duration-${value}`) ?? 30);
    const buffer = Number(formData.get(`buffer-${value}`) ?? 0);

    if (!active) {
      deletes.push(value);
      continue;
    }
    if (!startTime || !endTime) continue;

    updates.push({
      dayOfWeek: value,
      startTime,
      endTime,
      duration: Number.isFinite(duration) ? duration : 30,
      buffer: Number.isFinite(buffer) ? buffer : 0,
      isActive: true,
    });
  }

  if (deletes.length) {
    await prisma.availability.deleteMany({
      where: {
        userId: user.id,
        dayOfWeek: { in: deletes },
      },
    });
  }

  for (const entry of updates) {
    await prisma.availability.upsert({
      where: {
        userId_dayOfWeek: {
          userId: user.id,
          dayOfWeek: entry.dayOfWeek,
        },
      },
      create: {
        userId: user.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        buffer: entry.buffer,
        isActive: true,
      },
      update: {
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        buffer: entry.buffer,
        isActive: true,
      },
    });
  }

  revalidatePath('/dashboard/scheduling');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/onboarding');
}
