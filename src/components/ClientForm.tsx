'use client';

import { useState } from 'react';

export type ClientFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
  assignedToId?: string | null;
  isLead: boolean;
};

type ClientFormProps = {
  initialValues?: Partial<ClientFormValues>;
  onSubmit: (values: ClientFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
  assignableUsers?: { id: string; name: string | null; email: string | null }[];
  canAssign?: boolean;
  allowUnassigned?: boolean;
};

const US_STATES = [
  { value: '', label: 'Select state' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const defaults: ClientFormValues = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'USA',
  notes: '',
  assignedToId: null,
  isLead: false,
};

export function ClientForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'Save Client',
  assignableUsers,
  canAssign = false,
  allowUnassigned = true,
}: ClientFormProps) {
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const merged = { ...defaults, ...initialValues };
  const disabled = submitting || localSubmitting;
  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const get = (key: keyof ClientFormValues) => ((formData.get(key) as string | null) ?? '').toString().trim();
    const typeValue = (formData.get('isLead') as string | null) ?? (merged.isLead ? 'lead' : 'client');

    const payload: ClientFormValues = {
      companyName: get('companyName'),
      contactName: get('contactName'),
      email: get('email'),
      phone: get('phone'),
      addressLine1: get('addressLine1'),
      addressLine2: get('addressLine2'),
      city: get('city'),
      state: get('state'),
      postalCode: get('postalCode'),
      country: get('country') || 'USA',
      notes: get('notes'),
      assignedToId: canAssign ? get('assignedToId') || null : merged.assignedToId ?? null,
      isLead: typeValue === 'lead',
    };

    await onSubmit(payload);
    setLocalSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Type</label>
        <select
          name="isLead"
          defaultValue={merged.isLead ? 'lead' : 'client'}
          className={`${inputClass} bg-white`}
          disabled={disabled}
        >
          <option value="client">Client</option>
          <option value="lead">Lead</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Company Name (optional)</label>
        <input
          name="companyName"
          defaultValue={merged.companyName}
          placeholder="Leave blank for individuals"
          className={inputClass}
          disabled={disabled}
        />
      </div>

      {assignableUsers && assignableUsers.length > 0 && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Assign to</label>
          <select
            name="assignedToId"
            defaultValue={
              merged.assignedToId ??
              (allowUnassigned ? '' : assignableUsers[0]?.id ?? '')
            }
            className={`${inputClass} bg-white`}
            disabled={disabled || !canAssign}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Contact Name *</label>
          <input
            name="contactName"
            defaultValue={merged.contactName}
            required
            className={inputClass}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Email *</label>
          <input
            name="email"
            type="email"
            defaultValue={merged.email}
            required
            className={inputClass}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Phone</label>
        <input name="phone" defaultValue={merged.phone} className={inputClass} disabled={disabled} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Address</label>
        <input
          name="addressLine1"
          placeholder="Street"
          defaultValue={merged.addressLine1}
          className={inputClass}
          disabled={disabled}
        />
        <input
          name="addressLine2"
          placeholder="Apt, suite, etc."
          defaultValue={merged.addressLine2}
          className={`${inputClass} mt-2`}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input name="city" placeholder="City" defaultValue={merged.city} className={inputClass} disabled={disabled} />
        <select
          name="state"
          defaultValue={merged.state}
          className={`${inputClass} bg-white`}
          disabled={disabled}
        >
          {US_STATES.map((state) => (
            <option key={state.value || 'none'} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
        <input
          name="postalCodeZip"
          placeholder="ZIP"
          defaultValue={merged.postalCode}
          className={inputClass}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Country</label>
          <input name="country" defaultValue={merged.country || 'USA'} className={inputClass} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={merged.notes}
            className={`${inputClass} min-h-[120px]`}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          disabled={disabled}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {disabled ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
