'use client';

import { useState } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';

interface GoogleCalendarConnectProps {
  initialConnected: boolean;
  initialEmail?: string | null;
  userId: string;
}

export function GoogleCalendarConnect({
  initialConnected,
  initialEmail,
  userId,
}: GoogleCalendarConnectProps) {
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [connectedEmail, setConnectedEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Redirect to OAuth flow
      // Pass userId via cookie or session
      document.cookie = `userId=${userId}; path=/; max-age=600`; // 10 minutes
      window.location.href = '/api/auth/google/calendar';
    } catch (err) {
      setError('Failed to initiate connection');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Your bookings will no longer sync.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/google/calendar/disconnect', {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setIsConnected(false);
      setConnectedEmail(null);
    } catch (err) {
      setError('Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-primary-600 bg-white shadow-sm">
      <h2 className="text-xl font-bold uppercase tracking-[0.3em] bg-brand-primary-600 text-[var(--color-brand-contrast)] rounded-t-2xl px-4 py-2 text-center">
        Google Calendar Sync
      </h2>
      <div className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm text-gray-500">
              {isConnected
                ? 'Your calendar is connected and syncing'
                : 'Connect to sync bookings with your Google Calendar'}
            </p>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="mt-3 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            )}
          </div>
        </div>
        {isConnected && (
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-2 text-emerald-900">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
                  Connected
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isConnected && connectedEmail && (
        <div className="mt-4 rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-800">
            Connected to: <span className="font-medium">{connectedEmail}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!isConnected && (
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <p className="font-medium">What you'll get:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Bookings automatically added to your calendar</li>
            <li>All existing Google Calendar events block time slots</li>
            <li>Google Meet links created for video calls</li>
            <li>Prevent double-bookings with busy time sync</li>
            <li>Guest email invites sent automatically</li>
          </ul>
        </div>
      )}

      {!isConnected && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-700 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
