import { describe, expect, it } from 'vitest';
import { buildUnpaidInvoiceRequest } from '@/app/dashboard/(with-shell)/invoices/new/submit';

describe('buildUnpaidInvoiceRequest', () => {
  const body = { items: [], status: 'UNPAID' };

  it('uses POST for new invoices', () => {
    const result = buildUnpaidInvoiceRequest({
      isEdit: false,
      body,
    });

    expect(result.url).toBe('/api/invoices');
    expect(result.options.method).toBe('POST');
    expect(result.options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result.options.body).toBe(JSON.stringify(body));
  });

  it('uses PUT for edits when editId exists', () => {
    const result = buildUnpaidInvoiceRequest({
      isEdit: true,
      editId: 'invoice-123',
      body,
    });

    expect(result.url).toBe('/api/invoices/invoice-123');
    expect(result.options.method).toBe('PUT');
  });

  it('falls back to POST when editId is missing despite edit mode', () => {
    const result = buildUnpaidInvoiceRequest({
      isEdit: true,
      editId: null,
      body,
    });

    expect(result.url).toBe('/api/invoices');
    expect(result.options.method).toBe('POST');
  });
});
