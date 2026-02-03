
import { NextRequest, NextResponse } from 'next/server';
import { sendMessageEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();
  if (!name || !email || !message) {
    return new NextResponse('Missing fields', { status: 400 });
  }

  // Send email using nodemailer or your email provider
  // For demonstration, this is a placeholder. Replace with your email logic.
  try {
    await sendMessageEmail({
      to: 'petere2103@gmail.com',
      fromName: name,
      fromEmail: email,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Contact form email error:', error);
    return new NextResponse('Failed to send', { status: 500 });
  }
}
