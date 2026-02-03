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
    const [showPositionModal, setShowPositionModal] = useState(false);
    const [newPositionName, setNewPositionName] = useState('');
    const [addingPosition, setAddingPosition] = useState(false);
    const [addPositionError, setAddPositionError] = useState<string | null>(null);

    const handleAddPosition = async () => {
      if (!newPositionName.trim()) {
        setAddPositionError('Position name required');
        return;
      }
      setAddingPosition(true);
      setAddPositionError(null);
      try {
        const res = await fetch('/api/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newPositionName }),
        });
        if (!res.ok) throw new Error(await res.text());
        const newPosition = await res.json();
        setPositions((prev) => [...prev, newPosition]);
        setFormData((fd) => ({ ...fd, positionId: newPosition.id }));
        setShowPositionModal(false);
        setNewPositionName('');
      } catch (err: any) {
        setAddPositionError(err.message || 'Failed to add position');
      } finally {
        setAddingPosition(false);
      }
    };
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
    role: member.role ?? 'USER',
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
        router.push('/dashboard/team');
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
    <div className="flex justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-7xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
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
                    {member.name
                      ? member.name
                          .split(' ')
                          .map(word => word[0]?.toUpperCase())
                          .join('')
                      : member.email[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">{member.name ?? 'Unnamed'}</h3>
              <p className="text-sm text-zinc-500">{member.email}</p>
              <div className="mt-2">
                <label className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 cursor-pointer">
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
          <div className="flex items-center gap-2">
            <input
              id="make-admin"
              type="checkbox"
              checked={formData.role === 'ADMIN'}
              onChange={e => setFormData({ ...formData, role: e.target.checked ? 'ADMIN' : 'USER' })}
              className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
            />
            <label htmlFor="make-admin" className="text-sm font-medium text-zinc-700 select-none">
              Make Administrator
            </label>
          </div>
        </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-zinc-200 shadow-sm focus:border-brand-primary-500 focus:ring-brand-primary-500 text-base py-3 px-4 min-h-[48px]"
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
            className="mt-1 block w-full rounded-md border border-zinc-200 shadow-sm focus:border-brand-primary-500 focus:ring-brand-primary-500 text-base py-3 px-4 min-h-[48px]"
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
            className="mt-1 block w-full rounded-md border border-zinc-200 shadow-sm focus:border-brand-primary-500 focus:ring-brand-primary-500 text-base py-3 px-4 min-h-[48px]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="positionId" className="block text-sm font-medium text-zinc-700">
          Position
        </label>
        <div className="flex gap-2 items-center">
          <select
            id="positionId"
            value={formData.positionId}
            onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
            disabled={loadingPositions}
            className="mt-1 block w-full rounded-md border border-zinc-200 shadow-sm focus:border-brand-primary-500 focus:ring-brand-primary-500 text-base py-3 px-4 min-h-[48px] cursor-pointer"
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
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-brand-primary-600 px-6 py-2 min-h-[48px] text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 whitespace-nowrap"
            onClick={() => setShowPositionModal(true)}
          >
            + Add Position
          </button>
        </div>
      </div>

      {showPositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Add New Position</h3>
            <input
              type="text"
              value={newPositionName}
              onChange={e => setNewPositionName(e.target.value)}
              className="mb-3 block w-full rounded-md border border-zinc-200 px-3 py-2 focus:border-brand-primary-500 focus:ring-brand-primary-500"
              placeholder="Position name"
              autoFocus
            />
            {addPositionError && <p className="text-xs text-rose-500 mb-2">{addPositionError}</p>}
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => { setShowPositionModal(false); setNewPositionName(''); setAddPositionError(null); }}
                disabled={addingPosition}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-700 disabled:opacity-50"
                onClick={handleAddPosition}
                disabled={addingPosition}
              >
                {addingPosition ? 'Adding...' : 'Add Position'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="reportsToId" className="block text-sm font-medium text-zinc-700">
          Reports To
        </label>
        <select
          id="reportsToId"
          value={formData.reportsToId}
          onChange={(e) => setFormData({ ...formData, reportsToId: e.target.value })}
          className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-brand-primary-500 focus:ring-brand-primary-500 text-base py-3 px-4 min-h-[48px] cursor-pointer"
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
          onClick={() => router.push('/dashboard/team')}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      </form>
    </div>
  );
}
