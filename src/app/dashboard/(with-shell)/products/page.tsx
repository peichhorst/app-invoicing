import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { formatCurrency, statusClasses } from './utils';
import { ProductActions } from './ProductActions';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="p-8 text-center text-sm font-medium text-rose-600">Not authenticated</div>;
  }

  const isOwner = user.role === 'OWNER';
  const isAdmin = user.role === 'ADMIN';
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const hasElevatedAccess = isOwner || isAdmin || isSuperAdmin;

  if (!hasElevatedAccess) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/80 p-6 text-center text-sm text-zinc-600 shadow-sm">
          Product management requires owner or admin access.
        </div>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { updatedAt: 'desc' },
    ],
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Catalog of products used by the billing APIs. Use the dedicated New Product page to add a record.
          </p>
        </div>
        <div className="flex justify-end">
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-4 text-lg font-medium text-zinc-900">No products yet</h3>
          <p className="mt-2 text-sm text-zinc-500">Create a product via the admin product API to get started.</p>
          <Link
            href="/dashboard/products/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
          >
            <Plus className="h-4 w-4" />
            Seed Catalog
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Product</th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Price</th>
                  <th className="px-6 py-3 text-left font-medium">Interval</th>
                  <th className="px-6 py-3 text-left font-medium">Tags</th>
                  <th className="px-6 py-3 text-left font-medium">Updated</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-zinc-200 bg-white text-sm">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-medium text-brand-primary-600 hover:text-brand-primary-700">{product.name}</p>
                    <p className="text-xs text-zinc-500">{product.slug}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-zinc-700">{product.type}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        statusClasses[product.status] ?? 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-zinc-700">{formatCurrency(product.unitAmount, product.currency)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-zinc-700">{product.interval ?? 'One-time'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    {product.tags.length ? product.tags.join(', ') : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {new Date(product.updatedAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <ProductActions id={product.id} slug={product.slug} />
                      {product.status === 'ACTIVE' ? (
                        <Link
                          href={`/api/public/products/${product.slug}`}
                          className="text-brand-primary-600 hover:text-brand-primary-700"
                        >
                          API
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          API (active only)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
