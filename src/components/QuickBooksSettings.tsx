'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface QuickBooksSettingsProps {
  isConnected: boolean;
  realmId?: string | null;
}

export function QuickBooksSettings({ isConnected: initialConnected, realmId }: QuickBooksSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check for callback success/error
    const qbSuccess = searchParams.get('qbSuccess');
    const qbError = searchParams.get('qbError');

    if (qbSuccess === 'true') {
      setMessage({ type: 'success', text: 'QuickBooks connected successfully!' });
      setIsConnected(true);
      // Clean up URL
      router.replace('/dashboard/settings');
    } else if (qbError) {
      setMessage({ type: 'error', text: `Connection failed: ${qbError}` });
      // Clean up URL
      router.replace('/dashboard/settings');
    }
  }, [searchParams, router]);

  const handleConnect = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/integrations/quickbooks/connect');
      if (!res.ok) {
        throw new Error('Failed to create authorization URL');
      }

      const data = await res.json();
      // Redirect to QuickBooks OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? This will not delete any data in QuickBooks.')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/integrations/quickbooks/disconnect', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to disconnect QuickBooks');
      }

      setMessage({ type: 'success', text: 'QuickBooks disconnected successfully' });
      setIsConnected(false);
      router.refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">QuickBooks Integration</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Sync your invoices and clients to QuickBooks Online
            </p>
          </div>

          {isConnected && realmId && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              <span>Connected (Company ID: {realmId.slice(0, 8)}...)</span>
            </div>
          )}

          {message && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        <div>
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2ca01c] px-4 py-2 text-sm font-medium text-white hover:bg-[#248518] disabled:opacity-50"
            >
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Connect to QuickBooks
            </button>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="mt-6 border-t border-zinc-200 pt-6">
          <h4 className="text-sm font-medium text-zinc-900">What gets synced?</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600">
            <li>• Invoices → QuickBooks Invoices</li>
            <li>• Clients → QuickBooks Customers</li>
            <li>• Line items and totals</li>
            <li>• Invoice status and payment tracking</li>
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Use the "Sync to QuickBooks" button on individual invoices to push data.
          </p>
        </div>
      )}
    </div>
  );
}
