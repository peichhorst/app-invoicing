import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = describePlan(user);
    return NextResponse.json({
      success: true,
      plan: plan.effectiveTier,
      planTier: plan.planTier,
      trialEndsAt: plan.trialEndsAt?.toISOString() ?? null,
      graceEndsAt: plan.graceEndsAt?.toISOString() ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to determine plan right now.';
    console.error('Check subscriptions failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
