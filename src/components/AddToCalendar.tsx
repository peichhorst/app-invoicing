'use client';

import { Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateYahooCalendarUrl,
  type CalendarEvent,
} from '@/lib/calendar';

interface AddToCalendarProps {
  event: CalendarEvent;
  bookingId?: string;
  className?: string;
}

export function AddToCalendar({ event, bookingId, className = '' }: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const googleUrl = generateGoogleCalendarUrl(event);
  const outlookUrl = generateOutlookCalendarUrl(event);
  const yahooUrl = generateYahooCalendarUrl(event);
  const icsUrl = bookingId ? `/api/calendar/ics?bookingId=${bookingId}` : '#';

  const calendarOptions = [
    {
      name: 'Google Calendar',
      url: googleUrl,
      icon: '🗓️',
    },
    {
      name: 'Outlook / Office 365',
      url: outlookUrl,
      icon: '📅',
    },
    {
      name: 'Apple Calendar',
      url: icsUrl,
      icon: '🍎',
      download: true,
    },
    {
      name: 'Yahoo Calendar',
      url: yahooUrl,
      icon: 'Ⓨ',
    },
    {
      name: 'Download .ics file',
      url: icsUrl,
      icon: '📥',
      download: true,
    },
  ];

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
      >
        <Calendar className="w-5 h-5" />
        Add to Calendar
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            {calendarOptions.map((option) => (
              <a
                key={option.name}
                href={option.url}
                target={option.download ? undefined : '_blank'}
                rel={option.download ? undefined : 'noopener noreferrer'}
                download={option.download ? 'event.ics' : undefined}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="text-sm font-medium">{option.name}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Simplified inline version for emails (no dropdown, just buttons)
export function AddToCalendarInline({ event, bookingId, className = '' }: AddToCalendarProps) {
  const googleUrl = generateGoogleCalendarUrl(event);
  const outlookUrl = generateOutlookCalendarUrl(event);
  const icsUrl = bookingId ? `/api/calendar/ics?bookingId=${bookingId}` : '#';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
      >
        🗓️ Google Calendar
      </a>
      
      <a
        href={outlookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
      >
        📅 Outlook
      </a>
      
      <a
        href={icsUrl}
        download="event.ics"
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm"
      >
        🍎 Apple Calendar
      </a>
    </div>
  );
}
