import React from 'react';

export function DashboardCalendar({ bookings }: { bookings: any[] }) {
  if (!bookings || bookings.length === 0) {
    return <div className="text-sm text-zinc-500">No upcoming bookings.</div>;
  }
  return (
    <ul>
      {bookings.slice(0, 5).map((b) => {
        const start = new Date(b.startTime);
        const month = start.toLocaleString('en-US', { month: 'short' });
        const day = start.getDate();
        const time = start.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return (
          <li key={b.id} className="py-4"> 
            <div className="flex gap-4">
              {/* Calendar icon column */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <span className="flex flex-col items-center justify-center w-[44px] h-[44px] rounded-md bg-white border border-zinc-200">
                    {/* Calendar icon header */}
                    <span className="flex items-center justify-center w-full h-4 bg-brand-primary-600 rounded-t-md">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                        <rect x="3" y="4" width="18" height="18" rx="4"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                      </svg>
                    </span>
                    <span className="block w-full text-center text-xs font-bold text-brand-primary-600 mt-0">{month}</span>
                    <span className="block w-full text-center text-lg font-extrabold leading-tight text-zinc-900 mb-4">{day}</span>
                  </span>
                </div>
              </div>
              {/* Info column */}
              <div className="flex flex-col justify-start flex-1 self-start -mt-2">
                <span className="font-medium text-zinc-900">{b.clientName}</span>
                <span className="text-xs text-zinc-500 flex items-center gap-2">
                  <span className="font-mono text-brand-primary-700 bg-brand-primary-50 rounded px-2 py-0.5">{time}</span>
                  <span className="capitalize">{b.status}</span>
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
