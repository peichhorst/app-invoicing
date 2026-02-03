"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

type UserOption = { id: string; name: string | null; email: string };

export default function UserFilterSelect({ users, current }: { users: UserOption[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUser = e.target.value;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newUser === 'all') {
        params.delete('user');
      } else {
        params.set('user', newUser);
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newUrl);
    });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="user" className="text-xs uppercase tracking-[0.2em] text-gray-500">
        User
      </label>
      <select
        id="user"
        name="user"
        value={current}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 disabled:opacity-50"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.email || 'Unnamed'}
          </option>
        ))}
      </select>
    </div>
  );
}
