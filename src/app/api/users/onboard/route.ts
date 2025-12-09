import { stripeConnect } from "@/lib/stripe-connect";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : null;
    const email = typeof body.email === "string" ? body.email : null;
    const country = typeof body.country === "string" ? body.country : "US";

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let accountId = user.stripeAccountId;

    if (!accountId) {
      const account = await stripeConnect.accounts.create({
        type: "express",
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeAccountId: accountId,
          stripeCustomerId: accountId,
        },
      });
    }

    const loginLink = await stripeConnect.accounts.createLoginLink(accountId);

    return NextResponse.json({ onboardingUrl: loginLink.url });
  } catch (error: any) {
    console.error("could not onboard user:", error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
