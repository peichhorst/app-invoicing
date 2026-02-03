'use client';

import { AddToCalendar, AddToCalendarInline } from '@/components/AddToCalendar';
import { type CalendarEvent } from '@/lib/calendar';
import { CheckCircle } from 'lucide-react';

interface BookingSuccessProps {
  booking: {
    id: string;
    title: string;
    startTime: Date | string;
    endTime: Date | string;
    location?: string;
    notes?: string;
    clientName: string;
    clientEmail: string;
  };
  hostName: string;
}

export function BookingSuccess({ booking, hostName }: BookingSuccessProps) {
  const startTime = typeof booking.startTime === 'string' 
    ? new Date(booking.startTime) 
    : booking.startTime;
  
  const endTime = typeof booking.endTime === 'string' 
    ? new Date(booking.endTime) 
    : booking.endTime;

  const event: CalendarEvent = {
    title: booking.title,
    description: booking.notes || `Meeting with ${hostName}`,
    location: booking.location || 'Online / Phone',
    startTime,
    endTime,
    attendeeEmail: booking.clientEmail,
    attendeeName: booking.clientName,
  };

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

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Confirmed! 🎉
        </h1>
        <p className="text-lg text-gray-600">
          Your meeting with <span className="font-semibold">{hostName}</span> has been scheduled.
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
        
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Event
            </div>
            <div className="text-base text-gray-900 font-medium">
              {booking.title}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Date
            </div>
            <div className="text-base text-gray-900 font-medium">
              {formattedDate}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Time
            </div>
            <div className="text-base text-gray-900 font-medium">
              {formattedTime} ({duration} minutes)
            </div>
          </div>

          {booking.location && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Location
              </div>
              <div className="text-base text-gray-900 font-medium">
                {booking.location}
              </div>
            </div>
          )}

          {booking.notes && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Notes
              </div>
              <div className="text-base text-gray-700">
                {booking.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          📅 Add to Your Calendar
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Don't forget! Add this event to your calendar so you don't miss it.
        </p>
        
        <div className="flex flex-col items-center gap-4">
          {/* Dropdown version for larger screens */}
          <div className="hidden sm:block">
            <AddToCalendar 
              event={event} 
              bookingId={booking.id}
            />
          </div>

          {/* Inline buttons for mobile */}
          <div className="sm:hidden w-full">
            <AddToCalendarInline 
              event={event} 
              bookingId={booking.id}
              className="justify-center"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Email Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-800">
          📧 A confirmation email with calendar links has been sent to{' '}
          <span className="font-semibold">{booking.clientEmail}</span>
        </p>
      </div>
    </div>
  );
}
