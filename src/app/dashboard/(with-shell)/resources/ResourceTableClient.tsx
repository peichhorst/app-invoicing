"use client";
const isValidUrl = (value?: string | null): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Accepts http(s), mailto, tel, or relative URLs
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed)) {
    try {
      // Only try to construct URL for absolute URLs
      if (/^(https?:\/\/)/i.test(trimmed)) {
        new URL(trimmed);
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye } from 'lucide-react';
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
  visibleToPositions: string[];
};

type CompanyUser = {
  id: string;
  positionId: string | null;
};

type Props = {
  resources: ResourceWithCompliance[];
  currentUserId: string | null;
  companyUsers: CompanyUser[];
};

const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf");
const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

export default function ResourceTableClient({
  resources,
  currentUserId,
  companyUsers,
}: Props) {
  const router = useRouter();
  const [selectedResource, setSelectedResource] = useState<ResourceWithCompliance | null>(null);
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackProcessing, setAckProcessing] = useState(false);

  const allUserIds = companyUsers.map((user) => user.id);

  const getAllowedUserIds = (resource: ResourceWithCompliance) => {
    if (!resource.visibleToPositions || resource.visibleToPositions.length === 0) {
      return new Set(allUserIds);
    }
    const allowed = companyUsers
      .filter((user) => user.positionId && resource.visibleToPositions.includes(user.positionId))
      .map((user) => user.id);
    return new Set(allowed);
  };

  const pendingCount = resources.filter((res) => {
    if (!res.requiresAcknowledgment) return false;
    const allowedSet = getAllowedUserIds(res);
    if (!currentUserId) return true;
    if (!allowedSet.has(currentUserId)) return false;
    return !res.acknowledgments.some((ack) => allowedSet.has(ack.userId));
  }).length;

  const selectedHref = useMemo(() => {
    if (!selectedResource) return "";
    return normalizeUrl(selectedResource.url);
  }, [selectedResource]);

  const [previewResource, setPreviewResource] = useState<ResourceWithCompliance | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewHref = useMemo(() => {
    if (!previewResource) return "";
    return normalizeUrl(previewResource.url);
  }, [previewResource]);

  const startPreview = (resource: ResourceWithCompliance) => {
    setPreviewResource(resource);
    setPreviewLoading(true);
  };

  const handleResourceClick = (event: MouseEvent<HTMLAnchorElement>, res: ResourceWithCompliance) => {
    const hasAck = currentUserId
      ? res.acknowledgments.some((ack) => ack.userId === currentUserId)
      : false;

    if (res.requiresAcknowledgment && !hasAck) {
      event.preventDefault();
      setSelectedResource(res);
      setAckChecked(false);
      setShowAckModal(true);
      startPreview(res);
      return;
    }
    const href = normalizeUrl(res.url);
    const previewable = href && (isPdf(href) || isImage(href));
    if (previewable) {
      event.preventDefault();
      startPreview(res);
      setShowPreviewModal(true);
      return;
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedResource) return;
    setAckProcessing(true);
    try {
      const response = await fetch(`/api/resources/${selectedResource.id}/acknowledge`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to acknowledge resource");
      }
      closeModal();
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setAckProcessing(false);
    }
  };

  const closePreview = () => {
    setShowPreviewModal(false);
    setPreviewLoading(false);
    setPreviewResource(null);
  };

  const closeModal = () => {
    setShowAckModal(false);
    setSelectedResource(null);
    setAckChecked(false);
    setPreviewResource(null);
    setPreviewLoading(false);
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
              <th className="px-4 py-3 text-left">Resource</th>
              <th className="px-4 py-3 text-left">Added</th>
              <th className="px-4 py-3 text-left">Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {resources.map((resource) => {
              const href = normalizeUrl(resource.url);
              const allowedSet = getAllowedUserIds(resource);
              const acknowledged = currentUserId ? allowedSet.has(currentUserId) && resource.acknowledgments.some((ack) => allowedSet.has(ack.userId)) : false;
              const acknowledgedCount = resource.acknowledgments.filter((ack) => allowedSet.has(ack.userId)).length;
              const allowedTotal = allowedSet.size;

              return (
                <tr key={resource.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{resource.title}</td>
                  <td className="px-4 py-3">
                    {isValidUrl(href) ? (
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
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-brand-primary-700 hover:bg-zinc-50 transition"
                              onClick={e => {
                                e.preventDefault();
                                handleResourceClick(e as any, resource);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          </div>
                        )}
                      </a>
                    ) : (
                      <span className="text-zinc-400">No file or invalid URL</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {resource.createdAt ? new Date(resource.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {resource.requiresAcknowledgment ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">
                            Compliance required
                          </span>
                          {acknowledged && (
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                              Acknowledged
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600">
                          Acknowledged by {acknowledgedCount} of {allowedTotal || allUserIds.length}{' '}
                          {allowedTotal === 0 ? '(no eligible positions)' : 'team members'}
                        </p>
                        <Link
                          href={`/dashboard/resources/${resource.id}`}
                          className="text-xs font-semibold text-brand-primary-600 hover:underline"
                        >
                          View acknowledgments
                        </Link>
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
              {isValidUrl(selectedHref) ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
                  <p className="text-xs text-zinc-500">
                    This document will open in a new tab when you click the link below.
                  </p>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
                    <Link href={selectedHref} className="text-brand-primary-600 hover:underline">
                      Open document
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No document URL available or invalid URL.</p>
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

      {showPreviewModal && previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">{previewResource.title}</h2>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Preview</p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              >
                Close
              </button>
            </div>
            <div className="mt-4 min-h-[60vh]">
              {previewLoading && (
                <div className="flex h-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-brand-primary-600" />
                </div>
              )}
              {previewHref ? (
                isPdf(previewHref) ? (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(
                        previewHref
                      )}&embedded=true`}
                    title={previewResource.title}
                    className="h-[80vh] w-full rounded-2xl border border-zinc-200"
                    onLoad={() => setPreviewLoading(false)}
                  />
                ) : (
                  <img
                    src={previewHref}
                    alt={previewResource.title}
                    className="mx-auto max-w-full rounded-2xl border border-zinc-200 object-contain"
                    onLoad={() => setPreviewLoading(false)}
                  />
                )
              ) : (
                <p className="text-sm text-zinc-500">Preview URL unavailable.</p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
              <a
                href={previewHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-brand-primary-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
              >
                Download
              </a>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-700"
              >
                Close preview
              </button>
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
