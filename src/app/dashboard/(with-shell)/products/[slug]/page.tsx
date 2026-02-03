import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ADMIN_ROLES } from '@/app/api/admin/products/utils';
import { formatCurrency, statusClasses } from '../utils';
import { parseProductList } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: any) {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    redirect('/dashboard/products');
  }
  const rawSlug = params?.slug;
  if (!rawSlug) {
    notFound();
  }
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  if (!slug) {
    notFound();
  }
  const product = await prisma.product.findUnique({
    where: { slug },
  });

  if (!product) {
    notFound();
  }

  const parsedTags = parseProductList(product.tags);
  const parsedFeatures = parseProductList(product.features);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">{product.name}</h1>
            <p className="text-sm text-zinc-500">
              {product.description ?? 'No description provided for this product.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
              statusClasses[product.status] ?? 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {product.status}
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            {product.type}
          </span>
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Price</p>
          <p className="text-lg font-bold text-zinc-900">{formatCurrency(product.unitAmount, product.currency)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Interval</p>
          <p className="text-sm text-zinc-700">
            {product.interval ? `${product.interval} (${product.intervalCount ?? 1})` : 'One-time'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Identifiers</p>
          <p className="text-sm text-zinc-700">{product.slug}</p>
          {product.stripeProductId && (
            <p className="text-sm text-zinc-700">Stripe: {product.stripeProductId}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Tags</p>
          {parsedTags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {parsedTags.map((tag) => (
                <span key={tag} className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No tags defined.</p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Features</p>
          {parsedFeatures.length ? (
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              {parsedFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No features listed.</p>
          )}
        </div>
      </div>
    </div>
  );
}
