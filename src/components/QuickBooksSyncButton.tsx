'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface QuickBooksSyncButtonProps {
  invoiceId: string;
  companyConnected: boolean;
  isSynced?: boolean;
  syncedAt?: Date | string | null;
  syncError?: string | null;
  size?: 'sm' | 'md';
}

export function QuickBooksSyncButton({
  invoiceId,
  companyConnected,
  isSynced = false,
  syncedAt,
  syncError,
  size = 'md',
}: QuickBooksSyncButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!companyConnected) {
    return null; // Don't show if QB not connected at company level
  }

  const handleSync = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/integrations/quickbooks/sync-invoice/${invoiceId}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to sync');
      }

      const result = await res.json();
      setMessage('Synced successfully!');
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (error: any) {
      setMessage(error.message);
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonClasses = size === 'sm'
    ? 'inline-flex items-center gap-1.5 rounded-md bg-[#2ca01c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#248518] disabled:opacity-50'
    : 'inline-flex items-center gap-2 rounded-lg bg-[#2ca01c] px-4 py-2 text-sm font-medium text-white hover:bg-[#248518] disabled:opacity-50';

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSync}
        disabled={isLoading}
        className={buttonClasses}
        title={isSynced ? 'Re-sync to QuickBooks' : 'Sync to QuickBooks'}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : isSynced ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <img 
            src="https://plugin.intuit.com/sbg-web-shell-ui/6.3.0/shell/harmony/images/QuickBooks_green.svg" 
            alt="QB" 
            className="h-4 w-4 invert"
          />
        )}
        {isLoading ? 'Syncing...' : isSynced ? 'Re-sync to QB' : 'Sync to QB'}
      </button>

      {message && (
        <span className={`text-xs ${message.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>
          {message}
        </span>
      )}

      {!message && isSynced && syncedAt && (
        <span className="text-xs text-zinc-500">
          Last synced: {new Date(syncedAt).toLocaleString()}
        </span>
      )}

      {!message && syncError && (
        <span className="text-xs text-red-600" title={syncError}>
          <XCircle className="inline h-3 w-3" /> Sync error
        </span>
      )}
    </div>
  );
}
