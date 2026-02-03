'use client';

import { useState, useEffect, useRef } from 'react';
import { COUNTRIES } from '../lib/countries';

export type ClientFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
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
  website: '',
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
  // Helper to get flag emoji from country code or name
  function getFlagEmoji(country: string) {
    if (!country) return '';
    if (country.toLowerCase() === 'usa' || country.toLowerCase() === 'united states') return '🇺🇸';
    if (country.toLowerCase() === 'canada') return '🇨🇦';
    if (country.toLowerCase() === 'mexico') return '🇲🇽';
    const code = country.length === 2 ? country : countryToCode[country.toLowerCase()] || '';
    if (code.length === 2) {
      return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
    }
    return '';
  }
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
  const merged = { ...defaults, ...initialValues };
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const [formValues, setFormValues] = useState(merged);
  const [showCountry, setShowCountry] = useState(() => merged.country !== 'USA');
  const disabled = submitting || localSubmitting;
  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10';

  // Load Google Maps JavaScript API with Places library
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.maps?.places) {
      setGoogleMapsLoaded(true);
      return;
    }
    
    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      if (window.google?.maps) {
        setGoogleMapsLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setGoogleMapsLoaded(true));
      }
      return;
    }
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleMapsLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!autocompleteInputRef.current || typeof window === 'undefined' || !googleMapsLoaded) return;
    const googleMaps = window.google?.maps;
    if (!googleMaps?.places) return;

    const autocomplete = new googleMaps.places.Autocomplete(autocompleteInputRef.current, {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'geometry'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      let street = '';
      let city = '';
      let state = '';
      let zip = '';

      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes('street_number')) {
          street = component.long_name + ' ';
        }
        if (types.includes('route')) {
          street += component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name; // Use short_name for state abbreviation
        }
        if (types.includes('postal_code')) {
          zip = component.long_name;
        }
      }

      setFormValues(prev => ({
        ...prev,
        addressLine1: street.trim(),
        city: city,
        state: state,
        postalCode: zip,
      }));
      setAutocompleteInput('');
    });
  }, [googleMapsLoaded]);

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
      website: get('website'),
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
        <label className="text-sm font-medium text-zinc-700">Website</label>
        <input name="website" defaultValue={merged.website} type="url" className={inputClass} disabled={disabled} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700">Address</label>
        </div>
        <input
          ref={autocompleteInputRef}
          value={autocompleteInput}
          onChange={(e) => setAutocompleteInput(e.target.value)}
          placeholder="Search for address..."
          className={inputClass}
          disabled={disabled}
        />
        <input
          name="addressLine1"
          placeholder="Street"
          value={formValues.addressLine1}
          onChange={(e) => setFormValues(prev => ({ ...prev, addressLine1: e.target.value }))}
          className={inputClass}
          disabled={disabled}
        />
        <input
          name="addressLine2"
          placeholder="Apt, suite, etc."
          value={formValues.addressLine2}
          onChange={(e) => setFormValues(prev => ({ ...prev, addressLine2: e.target.value }))}
          className={`${inputClass} mt-2`}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input 
          name="city" 
          placeholder="City" 
          value={formValues.city}
          onChange={(e) => setFormValues(prev => ({ ...prev, city: e.target.value }))}
          className={inputClass} 
          disabled={disabled} 
        />
        <select
          name="state"
          value={formValues.state}
          onChange={(e) => setFormValues(prev => ({ ...prev, state: e.target.value }))}
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
          name="postalCode"
          placeholder="ZIP"
          value={formValues.postalCode}
          onChange={(e) => setFormValues(prev => ({ ...prev, postalCode: e.target.value }))}
          className={inputClass}
          disabled={disabled}
        />
      </div>


      <div className="space-y-1 mb-4">
        <select
          name="country"
          value={formValues.country}
          onChange={e => setFormValues(prev => ({ ...prev, country: e.target.value }))}
          className={inputClass}
          disabled={disabled}
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
          value={formValues.notes}
          onChange={e => setFormValues(prev => ({ ...prev, notes: e.target.value }))}
          className={`${inputClass} min-h-[120px]`}
          disabled={disabled}
        />
      </div>

      <div className="flex w-full items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          disabled={disabled}
        >
          Cancel
        </button>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)] disabled:opacity-60"
        >
          {disabled ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
