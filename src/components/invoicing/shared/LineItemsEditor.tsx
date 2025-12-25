"use client";

import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";

export type SimpleLineItem = {
  description: string;
  quantity: number;
  rate: number;
};

export type LineItemsEditorProps = {
  title?: string;
  subtitle?: string;
  items: SimpleLineItem[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onChangeItem: (index: number, field: keyof SimpleLineItem, value: string | number) => void;
  formatCurrency: (value: number) => string;
  footerExtras?: ReactNode;
};

export function LineItemsEditor({
  title = "Line Items",
  subtitle,
  items,
  onAddItem,
  onRemoveItem,
  onChangeItem,
  formatCurrency,
  footerExtras,
}: LineItemsEditorProps) {
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return sum + qty * rate;
  }, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center gap-1 rounded-lg border border-brand-primary-200 px-3 py-1 text-sm font-semibold text-brand-primary-700 transition hover:bg-brand-primary-50"
        >
          <Plus className="h-4 w-4" />
          Add line item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) => onChangeItem(index, "description", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-100"
                placeholder="Description"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="1"
                  value={item.quantity}
                  onChange={(e) =>
                    onChangeItem(
                      index,
                      "quantity",
                      e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-100"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) =>
                    onChangeItem(
                      index,
                      "rate",
                      e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-100"
                  placeholder="Rate"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {formatCurrency((Number(item.quantity) || 0) * (Number(item.rate) || 0))}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t border-gray-200 pt-4">
        <div className="flex justify-end text-lg">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Subtotal</span>
              <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-300 pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-brand-primary-600">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>
        {footerExtras}
      </div>
    </div>
  );
}
