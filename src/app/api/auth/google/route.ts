import crypto from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, sessionCookieOptions } from "@/lib/auth";
import { TRIAL_LENGTH_MS } from "@/lib/plan";
import { sendRegistrationAlert } from "@/lib/email";
import { Role } from "@prisma/client";

const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

type GooglePayload = {
  idToken?: string;
};

type GoogleTokenInfo = {
  aud?: string;
  exp?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  sub?: string;
};

function hasVerifiedEmail(info: GoogleTokenInfo) {
  return !!info.email && (info.email_verified === "true" || info.email_verified === "1" || info.email_verified === true);
}

async function createGoogleUser(email: string, name?: string) {
  const defaultName = name || email.split("@")[0] || "Invoice User";
  const hashedPassword = await hashPassword(crypto.randomUUID());
  const trialEndsAt = new Date(Date.now() + TRIAL_LENGTH_MS);

  const user = await prisma.user.create({
    data: {
      name: defaultName,
      email,
      password: hashedPassword,
      planTier: "PRO_TRIAL",
      role: Role.OWNER,
      proTrialEndsAt: trialEndsAt,
      proTrialReminderSent: false,
    },
  });

  const company = await prisma.company.create({
    data: {
      name: user.companyName?.trim() || `${defaultName}'s Workspace`,
      ownerId: user.id,
      users: { connect: { id: user.id } },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { companyId: company.id },
  });

  return user;
}

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as GooglePayload;

    if (!idToken) {
      return new Response("Google credential missing.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const params = new URLSearchParams({ id_token: idToken });
    const tokenResponse = await fetch(`${GOOGLE_TOKENINFO_URL}?${params}`);

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return new Response(`Google verification failed: ${error}`, {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const tokenInfo = (await tokenResponse.json()) as GoogleTokenInfo;

    if (!hasVerifiedEmail(tokenInfo)) {
      return new Response("Google account must have a verified email.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const email = tokenInfo.email as string;
    const name = tokenInfo.name;

    let user = await prisma.user.findUnique({ where: { email } });
    let registered = false;

    if (!user) {
      user = await createGoogleUser(email, name);
      registered = true;
      try {
        await sendRegistrationAlert(user.email);
      } catch (error) {
        console.error("Google registration alert failed", error);
      }
    }

    const { token } = await createSession(user.id);
    const res = NextResponse.json({ success: true, registered });
    res.cookies.set("session_token", token, sessionCookieOptions());
    return res;
  } catch (error: unknown) {
    console.error("Google auth failed", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Google authentication failed: ${detail}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
