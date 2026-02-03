import { NextRequest, NextResponse } from 'next/server';

// Example: Listen for QuickBooks Invoice and Payment webhooks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Log the webhook payload for debugging
    console.log('QuickBooks Webhook Received:', JSON.stringify(body, null, 2));

    // Example: Handle invoice and payment events
    if (body.eventNotifications) {
      for (const notification of body.eventNotifications) {
        for (const event of notification.dataChangeEvent.entities) {
          if (event.name === 'Invoice') {
            // Handle invoice created/updated/deleted
            // TODO: Sync invoice changes to your app
            console.log('Invoice event:', event.operation, event.id);
          }
          if (event.name === 'Payment') {
            // Handle payment created/updated/deleted
            // TODO: Sync payment changes to your app
            // console.log('Payment event:', event.operation, event.id);
          }
        }
      }
    }

    // Respond with 200 OK to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling QuickBooks webhook:', error);
    return new NextResponse('Webhook error', { status: 400 });
  }
}
