'use client';

import { useState, useTransition, useEffect } from 'react';
import { COUNTRIES } from '@/lib/countries';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type AssignableUser = { id: string; name: string | null; email: string | null; role?: string };
type NewLeadFormProps = {
  initialValues?: Partial<typeof defaultFormData>;
  assignableUsers?: AssignableUser[];
  canAssign?: boolean;
  allowUnassigned?: boolean;
};

const SOURCE_OPTIONS = [
  'Manual Entry',
  'Website',
  'Job Posting',
  'Directory',
  'Referral',
  'Import',
  'Cold Outreach',
  'System',
  'Other',
];

const defaultFormData = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'USA',
  notes: '',
  assignedToId: '',
  source: '',
  status: 'new',
};

export function NewLeadForm({ initialValues, assignableUsers = [], canAssign = false, allowUnassigned = true }: NewLeadFormProps) {
    // Helper to get flag emoji from country code or name
    function getFlagEmoji(country: string) {
      if (!country) return '';
      // Handle common cases
      if (country.toLowerCase() === 'usa' || country.toLowerCase() === 'united states') return '🇺🇸';
      if (country.toLowerCase() === 'canada') return '🇨🇦';
      if (country.toLowerCase() === 'mexico') return '🇲🇽';
      // Try to get flag from ISO country code (2-letter)
      const code = country.length === 2 ? country : countryToCode[country.toLowerCase()] || '';
      if (code.length === 2) {
        return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
      }
      return '';
    }

    // Minimal mapping for a few common countries
    const countryToCode: Record<string, string> = {
      'united states': 'US',
      'usa': 'US',
      'canada': 'CA',
      'mexico': 'MX',
      'united kingdom': 'GB',
      'germany': 'DE',
      'france': 'FR',
      'spain': 'ES',
      'italy': 'IT',
      'australia': 'AU',
      'japan': 'JP',
      'china': 'CN',
      'india': 'IN',
      'brazil': 'BR',
      'south africa': 'ZA',
      'new zealand': 'NZ',
    };
  const merged = { ...defaultFormData, ...initialValues };
  const [formData, setFormData] = useState(merged);
  const initialSourceOption = (() => {
    if (merged.source && SOURCE_OPTIONS.includes(merged.source)) {
      return merged.source;
    }
    return merged.source ? 'Other' : 'Manual Entry';
  })();
  const [sourceOption, setSourceOption] = useState(initialSourceOption);
  const [otherSource, setOtherSource] = useState(initialSourceOption === 'Other' ? merged.source : '');
  const [showCountry, setShowCountry] = useState(() => formData.country !== 'USA');


  // Set default assignedToId to first assignable user (owner/admin) if available
  useEffect(() => {
    if (
      assignableUsers &&
      assignableUsers.length > 0 &&
      (!formData.assignedToId || !assignableUsers.some(u => u.id === formData.assignedToId))
    ) {
      // Prefer OWNER, else first
      const owner = assignableUsers.find(u => u.role === 'OWNER');
      const defaultId = owner ? owner.id : assignableUsers[0].id;
      setFormData(prev => ({ ...prev, assignedToId: defaultId }));
    }
    // eslint-disable-next-line
  }, [assignableUsers.length, formData.assignedToId]);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const newSource = sourceOption === 'Other' ? otherSource : sourceOption;
    if (formData.source !== newSource) {
      setFormData((prev) => ({ ...prev, source: newSource }));
    }
  }, [sourceOption, otherSource, formData.source]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formDataObj = new FormData(form);
    const get = (key: string) => (formDataObj.get(key) as string | null) ?? '';
    const payload = {
      ...formData,
      companyName: get('companyName'),
      contactName: get('contactName'),
      email: get('email'),
      phone: get('phone'),
      website: get('website'),
      addressLine1: get('addressLine1'),
      addressLine2: get('addressLine2'),
      city: get('city'),
      state: get('state'),
      postalCode: get('postalCode'),
      country: get('country') || 'USA',
      notes: get('notes'),
      assignedToId: get('assignedToId'),
      source: formData.source,
      status: get('status'),
    };
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create lead');
      }
      startTransition(() => {
        router.push('/dashboard/leads');
        router.refresh();
      });
    } catch (error: any) {
      alert(error.message || 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Company Name (optional)</label>
          <input
            name="companyName"
            value={formData.companyName}
            onChange={e => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="Leave blank for individuals"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

          {/* ...existing code... */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Contact Name *</label>
              <input
                name="contactName"
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Email *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Phone</label>
          <input
            name="phone"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Website</label>
          <input
            name="website"
            value={formData.website}
            onChange={e => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700">Address</label>
          </div>
          <input
            name="addressLine1"
            placeholder="Street"
            value={formData.addressLine1}
            onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <input
            name="addressLine2"
            placeholder="Apt, suite, etc."
            value={formData.addressLine2}
            onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 mt-2"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input 
            name="city" 
            placeholder="City" 
            value={formData.city}
            onChange={e => setFormData({ ...formData, city: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10" 
          />
          <input
            name="state"
            placeholder="State"
            value={formData.state}
            onChange={e => setFormData({ ...formData, state: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <input
            name="postalCode"
            placeholder="ZIP"
            value={formData.postalCode}
            onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        <div className="space-y-1 mb-4">
          <select
            name="country"
            value={formData.country}
            onChange={e => setFormData({ ...formData, country: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.name}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 mb-4">
          <label className="text-sm font-medium text-zinc-700">Notes</label>
          <textarea
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[120px]"
          />
        </div>

        {assignableUsers && assignableUsers.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Assign to</label>
            <select
              name="assignedToId"
              value={formData.assignedToId}
              onChange={e => setFormData({ ...formData, assignedToId: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              {allowUnassigned && <option value="">Unassigned</option>}
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email || user.id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Source</label>
          <select
            name="sourceOption"
            value={sourceOption}
            onChange={(e) => {
              const value = e.target.value;
              setSourceOption(value);
              if (value !== 'Other') {
                setOtherSource('');
              }
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {sourceOption === 'Other' && (
            <input
              name="source"
              value={otherSource}
              onChange={(e) => setOtherSource(e.target.value)}
              placeholder="Describe how this lead found you"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="qualified">Qualified</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <div className="flex w-full items-center gap-3 pt-2">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </Link>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)] disabled:opacity-60"
            >
              {isPending ? 'Saving...' : 'Create Lead'}
            </button>
          </div>
        </div>
      </form>
  );
}
