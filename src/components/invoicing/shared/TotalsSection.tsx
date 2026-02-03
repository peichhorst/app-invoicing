import React from 'react';

interface TotalsSectionProps {
  subtotal: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total: number;
  currency?: string;
}

const formatCurrency = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
};

export default function TotalsSection({
  subtotal,
  tax,
  taxRate,
  discount,
  total,
  currency = 'USD',
}: TotalsSectionProps) {
  return (
    <div className="flex justify-end">
      <div className="w-full max-w-sm space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between border-b border-gray-200 pb-2 text-sm">
          <span className="font-medium text-gray-600">Subtotal</span>
          <span className="font-semibold text-gray-900">{formatCurrency(subtotal, currency)}</span>
        </div>

        {/* Discount */}
        {discount !== undefined && discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-600">Discount</span>
            <span className="font-semibold text-green-600">-{formatCurrency(discount, currency)}</span>
          </div>
        )}

        {/* Tax */}
        {tax !== undefined && tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-600">
              Tax {taxRate ? `(${taxRate}%)` : ''}
            </span>
            <span className="font-semibold text-gray-900">{formatCurrency(tax, currency)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between border-t-2 border-gray-300 pt-3">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-lg font-bold text-brand-primary-600">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}
