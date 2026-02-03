'use client';

import { useState, useEffect } from 'react';
import DocumentPreview from '@/components/invoicing/DocumentPreview';
import { LineItemsEditor } from '@/components/invoicing/shared/LineItemsEditor';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClientOptions } from '@/components/invoicing/useClientOptions';
import { ClientSelect } from '@/components/invoicing/ClientSelect';
import { ClientForm, type ClientFormValues } from '@/components/ClientForm';
import { type ClientOption } from '@/app/dashboard/(with-shell)/invoices/new/actions';

type PaymentMilestone = {
  description: string;
  amount: number;
  dueDate: string;
};

export function NewContractForm({ userId }: { userId: string }) {
      const [company, setCompany] = useState<{ name: string; logoUrl?: string; address?: string; email?: string; phone?: string } | null>(null);
      useEffect(() => {
        let isMounted = true;
        fetch('/api/auth/me')
          .then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            return res.json();
          })
          .then((data) => {
            if (!isMounted) return;
            if (data?.user?.company) {
              const company = data.user.company;
              const addressParts = [
                company.addressLine1,
                company.addressLine2,
                [company.city, company.state].filter(Boolean).join(', '),
                company.postalCode,
                company.country !== 'USA' ? company.country : undefined,
              ].filter(Boolean);
              const fullAddress = addressParts.length > 0 ? addressParts.join('\n') : undefined;
              setCompany({
                name: company.name || '',
                logoUrl: company.logoUrl || undefined,
                address: fullAddress,
                email: company.email || undefined,
                phone: company.phone || undefined,
              });
            }
          })
          .catch(() => {});
        return () => { isMounted = false; };
      }, []);
    const [scopeOfWork, setScopeOfWork] = useState('');
    // Line items state
    type LineItem = { description: string; quantity: number; rate: number };
    const [items, setItems] = useState<LineItem[]>([
      { description: '', quantity: 1, rate: 0 },
    ]);
      // Line items handlers
      const addItem = () => setItems([...items, { description: '', quantity: 1, rate: 0 }]);
      const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
      const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
      };
      const formatCurrency = (value: number) => {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };
  const router = useRouter();
  const { clients, loading: clientsLoading } = useClientOptions();
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [addingClient, setAddingClient] = useState(false);

  // Form fields
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [terms, setTerms] = useState('');
  const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>([
    { description: '', amount: 0, dueDate: '' },
  ]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [revisionsIncluded, setRevisionsIncluded] = useState<number>(2);
  const [additionalRevisionRate, setAdditionalRevisionRate] = useState<number>(0);
  const [ipOwnership, setIpOwnership] = useState<string>('client');
  const [cancellationTerms, setCancellationTerms] = useState('');
  const [liabilityCap, setLiabilityCap] = useState<number>(0);
  const [governingLaw, setGoverningLaw] = useState('');
  const [disputeResolution, setDisputeResolution] = useState('');

  useEffect(() => {
    setClientOptions(clients);
  }, [clients]);

  const handleAddClient = async (values: ClientFormValues) => {
    setAddingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await res.text());
      const newClient = await res.json();
      const newOption = {
        id: newClient.id,
        companyName: newClient.companyName,
        contactName: newClient.contactName,
        email: newClient.email,
      };
      setClientOptions((prev) => [...prev, newOption]);
      setClientId(newClient.id);
      setShowNewClient(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add client');
    } finally {
      setAddingClient(false);
    }
  };

  const handleAddMilestone = () => {
    setPaymentMilestones([...paymentMilestones, { description: '', amount: 0, dueDate: '' }]);
  };

  const handleRemoveMilestone = (index: number) => {
    setPaymentMilestones(paymentMilestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: keyof PaymentMilestone, value: string | number) => {
    const updated = [...paymentMilestones];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentMilestones(updated);
  };

  const handleSubmit = async (e: React.FormEvent, sendToClient: boolean = false) => {
    e.preventDefault();
    if (!clientId || !title || !terms) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Always send timeline as string values
      const timeline = startDate || endDate ? {
        startDate: startDate || undefined,
        endDate: endDate || undefined
      } : null;
      const milestones = paymentMilestones.filter(m => m.description && m.amount > 0);
      const contractLineItems = items.filter(item => item.description && item.quantity > 0 && item.rate >= 0);

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clientId,
          title,
          terms,
          scopeOfWork,
          lineItems: contractLineItems.length > 0 ? contractLineItems : null,
          paymentMilestones: milestones.length > 0 ? milestones : null,
          timeline,
          revisionsIncluded,
          additionalRevisionRate: additionalRevisionRate > 0 ? additionalRevisionRate : null,
          ipOwnership,
          cancellationTerms: cancellationTerms || null,
          liabilityCap: liabilityCap > 0 ? liabilityCap : null,
          governingLaw: governingLaw || null,
          disputeResolution: disputeResolution || null,
          status: sendToClient ? 'sent' : 'draft',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to create contract');
      }

      const contract = await res.json();
      router.push(`/dashboard/contracts/${contract.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {showNewClient ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900">Add New Client</h3>
            <button
              type="button"
              onClick={() => setShowNewClient(false)}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
          <ClientForm 
            onSubmit={handleAddClient} 
            submitting={addingClient}
            onCancel={() => setShowNewClient(false)}
          />
        </div>
      ) : (
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Client Selection */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900">Client Information</h3>
            <div className="space-y-3">
              <ClientSelect
                clients={clientOptions}
                value={clientId}
                onChange={(val, client) => {
                  setClientId(val);
                  setSelectedClient(client);
                }}
                loading={clientsLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewClient(true)}
                className="text-sm text-brand-primary-600 hover:text-brand-primary-700"
              >
                + Add New Client
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">Contract Details</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Contract Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                placeholder="e.g., Web Development Services Agreement"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Scope of Work
              </label>
              <textarea
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-zinc-200 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                placeholder="Describe the scope of work for this contract..."
              />
            </div>
            {/* Line Items */}
            <LineItemsEditor
              items={items}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onChangeItem={updateItem}
              formatCurrency={formatCurrency}
            />
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Terms & Conditions <span className="text-red-500">*</span>
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={8}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                placeholder="Enter the full terms and conditions of this contract..."
                required
              />
            </div>
                    {/* ...existing code... */}
          </div>

          {/* Timeline */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">Project Timeline</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                />
              </div>
            </div>
          </div>



          
            {/* Payment Milestones */}
     
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Payment Milestones</h3>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="text-sm text-brand-primary-600 hover:text-brand-primary-700"
              >
                + Add Milestone
              </button>
            </div>
            {paymentMilestones.map((milestone, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <label className="block text-sm font-medium text-zinc-700">Description</label>
                  <input
                    type="text"
                    value={milestone.description}
                    onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                    placeholder="e.g., Initial deposit"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-zinc-700">Amount</label>
                  <input
                    type="number"
                    value={milestone.amount}
                    onChange={(e) => handleMilestoneChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-zinc-700">Due Date</label>
                  <input
                    type="date"
                    value={milestone.dueDate}
                    onChange={(e) => handleMilestoneChange(index, 'dueDate', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                  />
                </div>
                <div className="col-span-1">
                  {paymentMilestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Revisions */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">Revisions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Revisions Included</label>
                <input
                  type="number"
                  value={revisionsIncluded}
                  onChange={(e) => setRevisionsIncluded(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Additional Revision Rate ($)</label>
                <input
                  type="number"
                  value={additionalRevisionRate}
                  onChange={(e) => setAdditionalRevisionRate(parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Legal Terms */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">Legal Terms</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700">IP Ownership</label>
              <select
                value={ipOwnership}
                onChange={(e) => setIpOwnership(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
              >
                <option value="client">Client owns all IP</option>
                <option value="freelancer">Freelancer retains IP</option>
                <option value="shared">Shared ownership</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Cancellation Terms</label>
              <textarea
                value={cancellationTerms}
                onChange={(e) => setCancellationTerms(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                placeholder="e.g., Either party may cancel with 30 days written notice..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Liability Cap ($)</label>
              <input
                type="number"
                value={liabilityCap}
                onChange={(e) => setLiabilityCap(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                step="0.01"
                min="0"
                placeholder="Maximum liability amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Governing Law</label>
              <input
                type="text"
                value={governingLaw}
                onChange={(e) => setGoverningLaw(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                placeholder="e.g., State of California"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Dispute Resolution</label>
              <textarea
                value={disputeResolution}
                onChange={(e) => setDisputeResolution(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500"
                placeholder="e.g., Disputes will be resolved through binding arbitration..."
              />
            </div>
          </div>

            {/* Contract Preview (moved to bottom) */}
            <div className="mt-8">
              <DocumentPreview
                type="contract"
                company={company ? {
                name: company.name,
                logoUrl: company.logoUrl,
                address: company.address,
                email: company.email,
                phone: company.phone,
              } : undefined}
              client={selectedClient ? {
                name: selectedClient.companyName,
                companyName: selectedClient.companyName,
                email: selectedClient.email || undefined,
              } : undefined}
              lineItems={items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity) || 0,
                rate: Number(item.rate) || 0,
                amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
              }))}
              totals={{
                subtotal: items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0),
                tax: 0,
                total: items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0),
              }}
              documentNumber={undefined}
              issueDate={new Date()}
              startDate={startDate ? new Date(startDate + 'T00:00:00') : undefined}
              endDate={endDate ? new Date(endDate + 'T00:00:00') : undefined}
              paymentTerms={terms || undefined}
              notes={scopeOfWork || undefined}
              proposalTitle={title}
            />
          </div>
          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard/contracts"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
              className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700 disabled:opacity-50"
            >
              {saving ? 'Sending...' : 'Save & Send to Client'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
