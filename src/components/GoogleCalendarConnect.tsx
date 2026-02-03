'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';

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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Calendar Sync</h3>
            <p className="text-sm text-gray-500">
              {isConnected
                ? 'Your calendar is connected and syncing'
                : 'Connect to sync bookings with your Google Calendar'}
            </p>
          </div>
        </div>
        {isConnected && <CheckCircle className="h-5 w-5 text-green-600" />}
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

      <div className="mt-6 flex gap-3">
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-700 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
        )}
      </div>
    </div>
  );
}
