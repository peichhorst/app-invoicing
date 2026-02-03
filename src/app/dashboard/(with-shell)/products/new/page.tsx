import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import ProductCreateForm from '../ProductCreateForm';
import { ADMIN_ROLES } from '@/app/api/admin/products/utils';

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    redirect('/dashboard/products');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">New Product</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add a product that can be referenced from billing workflows and the public product API.
        </p>
      </div>

      <ProductCreateForm />

      <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 text-sm text-zinc-700 shadow-sm">
        <div className="flex items-center gap-2 text-zinc-600">
          <FileText className="h-5 w-5" />
          <p className="font-semibold text-zinc-900">API reference</p>
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          The UI uses the same schema as the <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">/api/admin/products</code> endpoint.
          You can also POST directly to that route with JSON payload fields such as <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">name</code>,
          <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">type</code>,
          <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">unitAmount</code>,
          optional <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">interval</code>/
          <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">intervalCount</code>, and <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">tags</code>/<code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800">features</code>.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/products"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
          >
            Back to catalog
          </Link>
          <a
            href="/api/admin/products"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
          >
            Open admin products API
          </a>
        </div>
      </div>
    </div>
  );
}
