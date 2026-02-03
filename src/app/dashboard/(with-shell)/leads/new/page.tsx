
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewLeadForm } from './NewLeadForm';

type MemberOption = { id: string; name: string | null; email: string | null; role?: string };

export default function NewLeadPage() {
  const router = useRouter();
  const [assignableUsers, setAssignableUsers] = useState<MemberOption[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        const meJson = await meRes.json().catch(() => null);
        const role = meJson?.user?.role as string | undefined;
        const elevated = role === 'OWNER' || role === 'ADMIN' || role === 'SUPERADMIN';
        if (meJson?.user?.id) {
          setCurrentUserId(meJson.user.id);
        }
        setCanAssign(elevated);

        const companyId = meJson?.user?.companyId ?? meJson?.user?.company?.id ?? null;
        if (companyId && elevated) {
          const membersRes = await fetch('/api/company/members');
          if (!membersRes.ok) throw new Error(await membersRes.text());
          const membersData = await membersRes.json();
          if (isMounted) {
            setAssignableUsers(membersData.members ?? []);
          }
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);


  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Add New Lead</h1>
          <p className="mt-1 text-sm text-zinc-500">Create a lead profile with contact and address details.</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <NewLeadForm
          initialValues={assignableUsers.length > 0 ? { assignedToId: assignableUsers[0].id } : undefined}
          assignableUsers={assignableUsers}
          canAssign={canAssign}
          allowUnassigned={false}
        />
      </div>
    </div>
  );
}
