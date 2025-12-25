type SignatureBlockProps = {
  signedBy?: string | null;
  signedAt?: Date | string | null;
  signatureUrl?: string | null;
  note?: string;
};

export default function SignatureBlock({
  signedBy,
  signedAt,
  signatureUrl,
  note = 'This is a legally binding contract. By signing, the client has agreed to the terms and scope outlined above.',
}: SignatureBlockProps) {
  const resolvedDate =
    signedAt ? new Date(signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-900">Digital Signature</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">Signed By:</span>
          <span className="font-semibold text-gray-900">{signedBy || '—'}</span>
        </div>
        {resolvedDate && (
          <div className="flex justify-between">
            <span className="text-gray-700">Date:</span>
            <span className="font-semibold text-gray-900">{resolvedDate}</span>
          </div>
        )}
        {signatureUrl && (
          <div className="rounded-lg border border-emerald-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Signature</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureUrl} alt="Signature" className="h-20 w-auto max-w-full object-contain" />
          </div>
        )}
        {!signatureUrl && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Signature not captured</p>
        )}
        <p className="mt-4 border-t border-emerald-200 pt-4 text-xs text-emerald-700">{note}</p>
      </div>
    </div>
  );
}
