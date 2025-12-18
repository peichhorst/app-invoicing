'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Member = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  position?: string | null;
  isConfirmed?: boolean | null;
  phone?: string | null;
  logoDataUrl?: string | null;
  reportsToId?: string | null;
  positionId?: string | null;
};

type Position = {
  id: string;
  name: string;
  order: number;
  isCustom: boolean;
};

type Props = {
  member: Member;
  managerOptions: { id: string; name: string | null; email: string | null }[];
};

export default function EditUserForm({ member, managerOptions }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(member.logoDataUrl ?? '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);

  const [formData, setFormData] = useState({
    name: member.name ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    positionId: member.positionId ?? '',
    reportsToId: member.reportsToId ?? '',
  });

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload an image.');
      return;
    }
    setUploadingLogo(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('logo', file);
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formDataObj,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Upload failed.');
      }
      const data = await res.json();
      setLogoDataUrl(data.secureUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setLogoError(message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveProfileImage = () => {
    setLogoDataUrl('');
    setLogoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/users/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, logoDataUrl }),
      });

      if (response.ok) {
        router.push('/owner/team');
      } else {
        alert('Failed to update user');
      }
    } catch (error) {
      alert('Error updating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
            {logoDataUrl ? (
              <>
                <img src={logoDataUrl} alt="Profile" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveProfileImage}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-600 shadow"
                  aria-label="Remove profile image"
                >
                  ×
                </button>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-400">
                {member.name?.[0]?.toUpperCase() ?? member.email[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{member.name ?? 'Unnamed'}</h3>
          <p className="text-sm text-zinc-500">{member.email}</p>
          <div className="mt-2">
            <label className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700 cursor-pointer">
              {logoDataUrl ? 'Change' : 'Upload'} Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
            {uploadingLogo && <p className="text-xs text-zinc-500 mt-1">Uploading...</p>}
            {logoError && <p className="text-xs text-rose-500 mt-1">{logoError}</p>}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
          Phone
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      <div>
        <label htmlFor="positionId" className="block text-sm font-medium text-zinc-700">
          Position
        </label>
        <select
          id="positionId"
          value={formData.positionId}
          onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
          disabled={loadingPositions}
          className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="">
            {loadingPositions ? 'Loading positions...' : 'Select position'}
          </option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="reportsToId" className="block text-sm font-medium text-zinc-700">
          Reports To
        </label>
        <select
          id="reportsToId"
          value={formData.reportsToId}
          onChange={(e) => setFormData({ ...formData, reportsToId: e.target.value })}
          className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="">No manager</option>
          {managerOptions.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {(manager.name && manager.name.trim()) || manager.email || 'Unnamed user'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3">
        <input type="hidden" name="logoDataUrl" value={logoDataUrl} />
        <button
          type="button"
          onClick={() => router.push('/owner/team')}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}