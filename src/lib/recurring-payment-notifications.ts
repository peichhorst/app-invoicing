import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyFailedRecurringPayment(
  recurringInvoiceId: string,
  invoiceId: string,
  errorMessage: string
) {
  try {
    // Get recurring invoice details
    const recurringInvoice = await prisma.recurringInvoice.findUnique({
      where: { id: recurringInvoiceId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        },
        client: {
          select: {
            email: true,
            companyName: true,
          },
        },
      },
    });

    if (!recurringInvoice) {
      console.error('Recurring invoice not found:', recurringInvoiceId);
      return;
    }

    const { user, client } = recurringInvoice;
    const companyName = user.company?.name || user.name || 'Your Company';

    // Notify business owner
    if (user.email) {
      await resend.emails.send({
        from: 'InvoiceBizz <noreply@invoicebizz.com>',
        to: user.email,
        subject: `Failed Payment: Recurring Invoice to ${client.companyName}`,
        html: `
          <h2>Automatic Payment Failed</h2>
          <p>The automatic payment for your recurring invoice to <strong>${client.companyName}</strong> has failed.</p>
          
          <p><strong>Error:</strong> ${errorMessage}</p>
          
          <p>The invoice has been generated and sent to your client. They will need to pay it manually.</p>
          
          <p>To prevent future failures, you may want to:</p>
          <ul>
            <li>Contact your client to update their payment method</li>
            <li>Review the recurring invoice settings</li>
          </ul>
          
          <p>Best regards,<br/>InvoiceBizz Team</p>
        `,
      });
    }

    // Notify client
    if (client.email) {
      await resend.emails.send({
        from: 'InvoiceBizz <noreply@invoicebizz.com>',
        to: client.email,
        subject: `Payment Failed - Action Required`,
        html: `
          <h2>Payment Failed</h2>
          <p>We were unable to process the automatic payment for your recurring invoice from <strong>${companyName}</strong>.</p>
          
          <p><strong>Error:</strong> ${errorMessage}</p>
          
          <p>Please log in to your client portal to update your payment method and complete the payment.</p>
          
          <p>Thank you,<br/>${companyName}</p>
        `,
      });
    }

    console.log(`✉️ Sent failed payment notifications for recurring invoice ${recurringInvoiceId}`);
  } catch (error) {
    console.error('Failed to send payment failure notification:', error);
  }
}
