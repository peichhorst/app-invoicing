export type UnpaidInvoiceRequestConfig = {
  url: string;
  options: RequestInit;
};

export type BuildUnpaidInvoiceRequestParams = {
  isEdit: boolean;
  editId?: string | null;
  body: unknown;
};

export function buildUnpaidInvoiceRequest({
  isEdit,
  editId,
  body,
}: BuildUnpaidInvoiceRequestParams): UnpaidInvoiceRequestConfig {
  const hasEditTarget = isEdit && Boolean(editId);
  const url = hasEditTarget
    ? `/api/invoices/${encodeURIComponent(editId as string)}`
    : '/api/invoices';
  const method = hasEditTarget ? 'PUT' : 'POST';

  return {
    url,
    options: {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  };
}
