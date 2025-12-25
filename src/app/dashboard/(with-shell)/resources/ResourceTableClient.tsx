"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, type MouseEvent } from "react";

type ResourceAck = {
  userId: string;
  acknowledgedAt?: string | null;
};

export type ResourceWithCompliance = {
  id: string;
  title: string;
  url?: string | null;
  createdAt?: string | null;
  requiresAcknowledgment: boolean;
  acknowledgments: ResourceAck[];
};

type Props = {
  resources: ResourceWithCompliance[];
  currentUserId: string | null;
  teamCount: number;
};

const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf");
const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

export default function ResourceTableClient({
  resources,
  currentUserId,
  teamCount,
}: Props) {
  const router = useRouter();
  const [selectedResource, setSelectedResource] = useState<ResourceWithCompliance | null>(null);
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackProcessing, setAckProcessing] = useState(false);

  const pendingCount = resources.filter((res) => {
    if (!res.requiresAcknowledgment) return false;
    if (!currentUserId) return true;
    return !res.acknowledgments.some((ack) => ack.userId === currentUserId);
  }).length;

  const selectedHref = useMemo(() => {
    if (!selectedResource) return "";
    return normalizeUrl(selectedResource.url);
  }, [selectedResource]);

  const handleResourceClick = (event: MouseEvent<HTMLAnchorElement>, res: ResourceWithCompliance) => {
    const hasAck = currentUserId
      ? res.acknowledgments.some((ack) => ack.userId === currentUserId)
      : false;

    if (res.requiresAcknowledgment && !hasAck) {
      event.preventDefault();
      setSelectedResource(res);
      setAckChecked(false);
      setShowAckModal(true);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedResource) return;
    setAckProcessing(true);
    try {
      const response = await fetch(`/api/resources/${selectedResource.id}/acknowledge`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Unable to acknowledge resource");
      }
      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setAckProcessing(false);
    }
  };

  const closeModal = () => {
    setShowAckModal(false);
    setSelectedResource(null);
    setAckChecked(false);
  };

  return (
    <>
      {pendingCount > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm">
          You have{" "}
          <span className="font-semibold">
            {pendingCount}
          </span>{" "}
          compliance document{pendingCount === 1 ? "" : "s"} awaiting your acknowledgment.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full table-auto text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Preview</th>
              <th className="px-4 py-3 text-left">Added</th>
              <th className="px-4 py-3 text-left">Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {resources.map((resource) => {
              const href = normalizeUrl(resource.url);
              const acknowledged = currentUserId
                ? resource.acknowledgments.some((ack) => ack.userId === currentUserId)
                : false;

              return (
                <tr key={resource.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{resource.title}</td>
                  <td className="px-4 py-3">
                    {href ? (
                      <a
                        href={href}
                        rel="noopener noreferrer"
                        target="_blank"
                        onClick={(event) => handleResourceClick(event, resource)}
                        className="flex items-center gap-2 text-brand-primary-700 hover:text-brand-primary-900"
                      >
                        {isImage(href) ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={href}
                              alt={resource.title}
                              loading="lazy"
                              className="h-10 w-10 rounded object-cover border border-zinc-200"
                              onError={(event) => {
                                (event.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <span className="text-xs font-semibold">View</span>
                          </div>
                        ) : isPdf(href) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">PDF</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">Open</span>
                          </div>
                        )}
                      </a>
                    ) : (
                      <span className="text-zinc-400">No file</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {resource.createdAt ? new Date(resource.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {resource.requiresAcknowledgment ? (
                      <div className="space-y-2">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">
                          Compliance required
                        </span>
                        <p className="text-xs text-zinc-600">
                          Acknowledged by {resource.acknowledgments.length} of {teamCount || 0} team members
                        </p>
                        <Link
                          href={`/dashboard/resources/${resource.id}`}
                          className="text-xs font-semibold text-brand-primary-600 hover:underline"
                        >
                          View acknowledgments
                        </Link>
                        {acknowledged && (
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                            Acknowledged
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">Compliance not required</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {resources.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-zinc-500">
                  No resources are currently shared with your team.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAckModal && selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl md:p-8">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-zinc-900">Acknowledge: {selectedResource.title}</h2>
                <p className="text-sm text-zinc-600">
                  Please review the material and confirm you understand before proceeding.
                </p>
              </div>
              {isPdf(selectedHref) ? (
                <iframe src={selectedHref} className="h-96 w-full rounded-2xl border border-zinc-200" />
              ) : isImage(selectedHref) ? (
                <img
                  src={selectedHref}
                  alt={selectedResource.title}
                  className="w-full rounded-2xl border border-zinc-200"
                />
              ) : (
                <Link href={selectedHref} className="text-brand-primary-600 hover:underline">
                  Open document
                </Link>
              )}
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(event) => setAckChecked(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                />
                <span>I have read and understood this document</span>
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Remind me later
                </button>
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  disabled={!ackChecked || ackProcessing}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {ackProcessing ? "Acknowledging..." : "Acknowledge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const normalizeUrl = (value?: string | null): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};
