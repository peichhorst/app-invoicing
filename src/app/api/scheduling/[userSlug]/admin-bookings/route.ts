import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const normalizeSlug = (slug: string) => slug.trim().toLowerCase();
const slugToName = (slug: string) => slug.replace(/[-_]+/g, " ").trim();

const findUser = async (slug: string) => {
  const normalized = normalizeSlug(slug);
  return prisma.user.findFirst({
    where: {
      OR: [
        { id: normalized },
        { email: { equals: normalized, mode: "insensitive" } },
        { name: { equals: slugToName(normalized), mode: "insensitive" } },
      ],
    },
  });
};

const AUTHORIZED_ROLES: Set<Role> = new Set([Role.ADMIN, Role.OWNER, Role.SUPERADMIN]);

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
