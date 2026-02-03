type ProposalDetailsSectionProps = {
  title: string;
  description?: string | null;
  scope?: string | null;
  createdAt?: Date | string | null;
  validUntil?: Date | string | null;
  signedAt?: Date | string | null;
  showTimeline?: boolean;
};

export default function ProposalDetailsSection({
  title,
  description,
  scope,
  createdAt,
  validUntil,
  signedAt,
  showTimeline = true,
}: ProposalDetailsSectionProps) {
  const createdDate = createdAt ? new Date(createdAt).toLocaleDateString() : null;
  const validDate = validUntil ? new Date(validUntil).toLocaleDateString() : null;
  const signedDate = signedAt ? new Date(signedAt).toLocaleDateString() : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{description}</p>
        )}
      </div>

      {scope && (
        <div className="rounded-lg border border-brand-primary-200 bg-brand-primary-50 p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-primary-900">
            Scope of Work
          </h3>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
            {scope}
          </div>
        </div>
      )}

      {showTimeline && validDate && createdDate && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Proposal Date:</span>
              <span className="font-semibold text-gray-900">{createdDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valid Until:</span>
              <span className="font-semibold text-gray-900">{validDate}</span>
            </div>
            {signedDate && (
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-600">Signed On:</span>
                <span className="font-semibold text-emerald-600">{signedDate}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
