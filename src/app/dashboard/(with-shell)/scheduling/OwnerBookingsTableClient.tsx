"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

const supabase = createSupabaseClient();

export type AdminBooking = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  notes: string | null;
  startTime: string;
  endTime: string;
  status: string;
};

type OwnerBookingsTableProps = {
  userId: string;
  timezone: string;
};

export default function OwnerBookingsTableClient({ userId, timezone }: OwnerBookingsTableProps) {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);

  useEffect(() => {
    if (!userId) return;
    let isActive = true;

    const loadBookings = async () => {
      const { data } = await supabase
        .from("booking")
        .select("*")
        .eq("userId", userId)
        .order("startTime", { ascending: false });
      if (!isActive) return;
      setBookings((data ?? []) as AdminBooking[]);
    };

    loadBookings();

    const formatFilter = `userId=eq.${userId}`;
    const channel = supabase
      .channel(`booking-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking",
          filter: formatFilter,
        },
        (payload: any) => {
          setBookings((prev) => {
            if (prev.some((booking) => booking.id === payload.new.id)) {
              return prev;
            }
            return [payload.new, ...prev];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "booking",
          filter: formatFilter,
        },
        (payload: any) => {
          setBookings((prev) => prev.filter((booking) => booking.id !== payload.old?.id));
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!bookings.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Recent bookings</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs text-zinc-600">
          <thead>
            <tr>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Client</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Email</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Phone</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Slot</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Notes</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {bookings.map((booking) => {
              const start = new Date(booking.startTime);
              const end = booking.endTime ? new Date(booking.endTime) : null;
              const timeLabel = `${start.toLocaleString("en-US", {
                timeZone: timezone,
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })} — ${end?.toLocaleTimeString("en-US", {
                timeZone: timezone,
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }) ?? "—"}`;
              return (
                <tr key={booking.id}>
                  <td className="px-3 py-2 font-semibold text-zinc-900">{booking.clientName}</td>
                  <td className="px-3 py-2">{booking.clientEmail}</td>
                  <td className="px-3 py-2">{booking.clientPhone ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-zinc-900">{timeLabel}</span>
                  </td>
                  <td className="px-3 py-2">{booking.notes || "—"}</td>
                  <td className="px-3 py-2 capitalize">{booking.status.toLowerCase()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
