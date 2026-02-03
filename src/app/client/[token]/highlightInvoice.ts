// src/app/client/[token]/highlightInvoice.ts
'use client';

import { useEffect } from 'react';

export function useHighlightInvoice(invoiceId: string | null) {
  useEffect(() => {
    if (!invoiceId) return;
    // Try to scroll to and highlight the invoice card
    const el = document.querySelector(`[data-invoice-id="${invoiceId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-brand-primary-600', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-brand-primary-600', 'ring-offset-2');
      }, 3000);
    }
  }, [invoiceId]);
}
