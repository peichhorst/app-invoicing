# Add Calendar Links to Booking Confirmation Email

## Files Created:
1. ✅ `src/lib/calendar.ts` - Calendar utility functions
2. ✅ `src/components/AddToCalendar.tsx` - React component for calendar buttons
3. ✅ `src/app/api/calendar/ics/route.ts` - API endpoint for .ics file downloads

## Integration Steps:

### Step 1: Update Your Existing Booking Email

In `src/app/api/scheduling/[userSlug]/bookings/route.ts`, find the client confirmation email (around line 238-251) and update it to include calendar links:

```typescript
// Add this import at the top
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  type CalendarEvent,
} from '@/lib/calendar';

// Inside your POST function, after creating the booking, before sending the email:
const calendarEvent: CalendarEvent = {
  title: `Session with ${user.name || companyName}`,
  description: notes || `Meeting with ${user.name || companyName}`,
  location: 'Online / Phone',
  startTime: new Date(start),
  endTime: new Date(end),
  attendeeEmail: clientEmail,
  attendeeName: clientName,
};

const googleCalUrl = generateGoogleCalendarUrl(calendarEvent);
const outlookCalUrl = generateOutlookCalendarUrl(calendarEvent);
const icsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/ics?bookingId=${newBooking.id}`;

// Then update your email HTML:
if (clientEmail) {
  await sendEmail({
    from: process.env.RESEND_FROM || 'invoices@858webdesign.com',
    to: [clientEmail.trim()],
    subject: `Booking confirmed with ${companyName}`,
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
        <h1 style="margin-bottom:12px; color:#111;">Booking confirmed</h1>
        <p style="margin-bottom:6px;">Hi ${clientName.split(' ')[0] || clientName},</p>
        <p style="margin-bottom:12px;">Your session with ${user.name || companyName} is booked for ${formattedDate} from ${formattedStart} - ${formattedEnd} (${timeZone}).</p>
        
        <!-- ADD CALENDAR SECTION HERE -->
        <div style="margin: 24px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 16px 0; font-weight: 600; color: #1f2937;">📅 Add to Your Calendar</p>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">Don't forget! Click a button below to add this to your calendar.</p>
          
          <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
            <a href="${googleCalUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; min-width: 240px; text-align: center;">
              🗓️ Add to Google Calendar
            </a>
            
            <a href="${outlookCalUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; min-width: 240px; text-align: center;">
              📅 Add to Outlook
            </a>
            
            <a href="${icsUrl}" download style="display: inline-block; padding: 12px 24px; background-color: transparent; color: #4f46e5; text-decoration: none; border-radius: 6px; font-weight: 500; min-width: 240px; text-align: center; border: 2px solid #4f46e5;">
              🍎 Download for Apple Calendar
            </a>
          </div>
        </div>
        
        <p style="margin:0;">If you need to reschedule, reply to this email.</p>
      </div>
    `,
  });
}
```

### Step 2: Optional - Add Success Page Component

If you have a success/confirmation page after booking, you can use the `BookingSuccess` component:

```tsx
import { BookingSuccess } from '@/components/BookingSuccess';

// In your booking success page:
<BookingSuccess 
  booking={booking} 
  hostName={hostName}
/>
```

## How It Works:

1. **Google Calendar** - Opens Google Calendar with pre-filled event details
2. **Outlook** - Opens Outlook/Office 365 with pre-filled event details  
3. **Apple Calendar** - Downloads a `.ics` file that works with Apple Calendar, Outlook desktop, and other calendar apps

All links work without requiring any special permissions or API keys - just like Calendly!

## Testing:

1. Create a test booking
2. Check your email
3. Click each calendar button to verify they work
4. The .ics download should trigger when clicking the Apple Calendar button

## Need Help?

If you encounter any issues:
- Make sure `NEXT_PUBLIC_APP_URL` is set in your `.env` file
- Check that the booking is being saved with the correct `id`, `startTime`, and `endTime`
- Verify the `prisma.booking` model matches the fields used in the API route
