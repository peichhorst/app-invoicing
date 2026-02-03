import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  type CalendarEvent,
} from '@/lib/calendar';

interface BookingConfirmationEmailProps {
  clientName: string;
  hostName: string;
  bookingTitle: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  notes?: string;
  bookingId: string;
  baseUrl: string;
}

export function generateBookingConfirmationEmail({
  clientName,
  hostName,
  bookingTitle,
  startTime,
  endTime,
  location,
  notes,
  bookingId,
  baseUrl,
}: BookingConfirmationEmailProps): string {
  const event: CalendarEvent = {
    title: bookingTitle,
    description: notes || `Meeting with ${hostName}`,
    location: location || 'Online / Phone',
    startTime,
    endTime,
  };

  const googleCalendarUrl = generateGoogleCalendarUrl(event);
  const outlookCalendarUrl = generateOutlookCalendarUrl(event);
  const icsUrl = `${baseUrl}/api/calendar/ics?bookingId=${bookingId}`;

  const formattedDate = startTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #4f46e5;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .success-icon {
      text-align: center;
      font-size: 64px;
      margin-bottom: 20px;
    }
    .greeting {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .details-box {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      border-left: 4px solid #4f46e5;
    }
    .detail-row {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .detail-value {
      font-size: 16px;
      color: #1f2937;
      font-weight: 500;
    }
    .calendar-section {
      margin: 32px 0;
      padding: 24px;
      background-color: #f0f9ff;
      border-radius: 8px;
      text-align: center;
    }
    .calendar-title {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 16px;
      font-weight: 600;
    }
    .calendar-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }
    .calendar-button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      min-width: 240px;
      text-align: center;
      transition: background-color 0.2s;
    }
    .calendar-button:hover {
      background-color: #4338ca;
    }
    .calendar-button-outline {
      background-color: transparent;
      color: #4f46e5;
      border: 2px solid #4f46e5;
    }
    .calendar-button-outline:hover {
      background-color: #eef2ff;
    }
    .footer {
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      background-color: #f9fafb;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .details-box {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Booking Confirmed!</h1>
    </div>
    
    <div class="content">
      <div class="success-icon">✅</div>
      
      <p class="greeting">Hi ${clientName},</p>
      
      <p>Your booking with <strong>${hostName}</strong> has been confirmed. We're looking forward to meeting with you!</p>
      
      <div class="details-box">
        <div class="detail-row">
          <div class="detail-label">Event</div>
          <div class="detail-value">${bookingTitle}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Date</div>
          <div class="detail-value">${formattedDate}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Time</div>
          <div class="detail-value">${formattedTime} (${duration} minutes)</div>
        </div>
        
        ${location ? `
        <div class="detail-row">
          <div class="detail-label">Location</div>
          <div class="detail-value">${location}</div>
        </div>
        ` : ''}
        
        ${notes ? `
        <div class="detail-row">
          <div class="detail-label">Notes</div>
          <div class="detail-value">${notes}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="calendar-section">
        <div class="calendar-title">📅 Add to Your Calendar</div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
          Don't forget! Click one of the buttons below to add this event to your calendar.
        </p>
        
        <div class="calendar-buttons">
          <a href="${googleCalendarUrl}" class="calendar-button" target="_blank">
            🗓️ Add to Google Calendar
          </a>
          
          <a href="${outlookCalendarUrl}" class="calendar-button" target="_blank">
            📅 Add to Outlook
          </a>
          
          <a href="${icsUrl}" class="calendar-button calendar-button-outline" download>
            🍎 Download for Apple Calendar
          </a>
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        If you need to reschedule or have any questions, please reply to this email.
      </p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} ClientWave. All rights reserved.</p>
      <p style="margin-top: 8px;">This email was sent regarding your booking confirmation.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
