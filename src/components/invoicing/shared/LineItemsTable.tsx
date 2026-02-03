import React from 'react';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface LineItemsTableProps {
  items: LineItem[];
  showTax?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export default function LineItemsTable({ items }: LineItemsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              Description
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
              Qty
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
              Rate
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {items.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">
                {formatCurrency(item.rate)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {formatCurrency(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
