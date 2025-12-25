'use client';

import { useState } from 'react';
import SignatureCapture from './SignatureCapture';

type ProposalSignatureFormProps = {
  proposalId: string;
  initialStatus: string;
  clientName?: string;
  signatureUrl?: string | null;
  signerName?: string;
  documentType?: 'PROPOSAL' | 'CONTRACT';
};

const SIGNABLE_STATUSES = ['SENT', 'VIEWED'];

export default function ProposalSignatureForm({
  proposalId,
  initialStatus,
  clientName = '',
  signatureUrl,
  signerName,
  documentType = 'PROPOSAL',
}: ProposalSignatureFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState(clientName);
  const [signedSignatureUrl, setSignedSignatureUrl] = useState<string | null>(signatureUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const docLabel = documentType === 'CONTRACT' ? 'contract' : 'proposal';
  const signedLabel = documentType === 'CONTRACT' ? 'Signed contract' : 'Signed proposal';
  const isSigned = status === 'SIGNED';
  const canSign = SIGNABLE_STATUSES.includes(status);

  const handleSign = async () => {
    if (!canSign || !signatureDataUrl) {
      setMessage('Please draw your signature before signing.');
      return;
    }
    if (!signatureName.trim()) {
      setMessage('Please enter your name for the signature.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/proposals/${proposalId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signatureName.trim(),
          signatureDataUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to sign right now.');
      }
      setStatus(data.status ?? 'SIGNED');
      setSignedSignatureUrl(signatureDataUrl);
      const signedOn = data.signedOn ? new Date(data.signedOn).toLocaleDateString() : new Date().toLocaleDateString();
      setMessage(`Signed on ${signedOn}. Thank you!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to sign right now.';
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!canSign && !isSigned) {
    return null;
  }

  if (isSigned) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand-primary-200 bg-white/70 p-5 shadow-sm text-zinc-900">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">Sign {docLabel}</p>
        <p className="text-sm font-semibold">Add your signature to accept the {docLabel}.</p>
      </div>
      <SignatureCapture
        name={signatureName}
        onNameChange={setSignatureName}
        onSignatureChange={setSignatureDataUrl}
      />
      <button
        type="button"
        onClick={handleSign}
        disabled={loading}
        className="w-full rounded-full border border-zinc-300 bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-700 disabled:opacity-60"
      >
        {loading ? 'Signing...' : `Sign ${docLabel}`}
      </button>
      {message && <p className="text-xs text-zinc-600">{message}</p>}
    </div>
  );
}
