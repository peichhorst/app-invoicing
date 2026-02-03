export type RevenueInvoice = {
  id: string;
  status: string;
  total: number;
  createdAt: Date;
  paidAt: Date | null;
};

export type RevenueDebugData = {
  total: number;
  sinceDate: Date | null;
  invoices: RevenueInvoice[];
};
