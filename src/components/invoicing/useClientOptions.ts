'use client';

import { useEffect, useState } from 'react';
import { fetchClientOptionsAction, type ClientOption } from '@/app/dashboard/(with-shell)/invoices/new/actions';

type UseClientOptionsResult = {
  clients: ClientOption[];
  loading: boolean;
  error: string | null;
};

export function useClientOptions(): UseClientOptionsResult {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchClientOptionsAction()
      .then((data) => {
        if (!isMounted) return;
        setClients(data);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load clients', err);
        setClients([]);
        setError('Unable to load clients');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { clients, loading, error };
}
