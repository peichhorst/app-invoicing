import { NextResponse } from 'next/server';
import { processDueRecurringInvoices } from '@/services/SubscriptionService';

export async function GET() {
  const result = await processDueRecurringInvoices();
  return NextResponse.json(result);
}
