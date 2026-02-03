import React from 'react';
import Image from 'next/image';

export type DocumentType = 'invoice' | 'proposal' | 'contract';

interface DocumentHeaderProps {
  company?: {
    name: string;
    logo?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  client?: {
    name: string;
    companyName?: string;
    email?: string;
    address?: string;
  };
  documentNumber?: string;
  documentDate?: Date;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  documentType?: DocumentType;
}

export default function DocumentHeader({
  company,
  client,
  documentNumber,
  documentDate,
  startDate,
  endDate,
  dueDate,
  documentType = 'invoice',
}: DocumentHeaderProps) {
  const formatDate = (date?: Date) => {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };
  const formattedDocumentDate = formatDate(documentDate);
  const formattedDueDate = formatDate(dueDate);
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  const documentLabel =
    documentType === 'invoice' ? 'Invoice' : documentType === 'contract' ? 'Contract' : 'Proposal';

  return (
    <div className="space-y-8">
      {/* Company and Document Info Row */}
      <div className="flex items-start justify-between">
        {/* Company Info */}
        <div className="space-y-2">
          {company?.logo && (
            <div className="mb-3">
              <Image
                src={company.logo}
                alt={company.name}
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          <h2 className="text-xl font-bold text-brand-primary-600">{company?.name}</h2>
          {company?.address && (
            <p className="text-sm text-gray-600 whitespace-pre-line">{company.address}</p>
          )}
          {company?.email && <p className="text-sm text-gray-600">{company.email}</p>}
          {company?.phone && <p className="text-sm text-gray-600">{company.phone}</p>}
        </div>

        {/* Document Details */}
        <div className="text-right">
          <h1 className="text-3xl font-bold text-brand-primary-600">{documentLabel}</h1>
          {documentNumber && (
            <p className="mt-1 text-sm font-semibold text-gray-700">#{documentNumber}</p>
          )}
          <div className="mt-4 space-y-1">
                {documentType === 'contract' ? (
                  <>
                    {formattedDocumentDate && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Today's Date: </span>
                        <span className="text-gray-600">{formattedDocumentDate}</span>
                      </div>
                    )}
                    {formattedStartDate && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Start Date: </span>
                        <span className="text-gray-600">{formattedStartDate}</span>
                      </div>
                    )}
                    {formattedEndDate && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">End Date: </span>
                        <span className="text-gray-600">{formattedEndDate}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {formattedDocumentDate && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Date: </span>
                        <span className="text-gray-600">{formattedDocumentDate}</span>
                      </div>
                    )}
                    {formattedDueDate && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">{documentType === 'invoice' ? 'Due: ' : 'Valid Until: '}</span>
                        <span className="text-gray-600">{formattedDueDate}</span>
                      </div>
                    )}
                  </>
                )}
          </div>
        </div>
      </div>

      {/* Client Info */}
      {client && (
        (() => {
          // Collect unique, non-empty, non-'Not specified' values
          const values = [client.name, client.companyName, client.email, client.address]
            .filter((v, i, arr) => v && typeof v === 'string' && v.trim() !== '' && arr.indexOf(v) === i);
          if (values.length === 0) return null;
          return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Bill To
              </h3>
              <div className="space-y-1">
                {values.map((v, idx) => (
                  <p key={idx} className={idx === 0 ? "font-semibold text-gray-900" : "text-sm text-gray-700"}>{v}</p>
                ))}
              </div>
            </div>
          );
        })()
      )}

    </div>
  );
}
