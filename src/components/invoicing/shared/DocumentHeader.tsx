import React from 'react';
import Image from 'next/image';

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
  dueDate?: Date;
  documentType?: 'invoice' | 'proposal';
}

export default function DocumentHeader({
  company,
  client,
  documentNumber,
  documentDate,
  dueDate,
  documentType = 'invoice',
}: DocumentHeaderProps) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const documentLabel = documentType === 'invoice' ? 'Invoice' : 'Proposal';

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
          <h2 className="text-xl font-bold text-gray-900">{company?.name}</h2>
          {company?.address && (
            <p className="text-sm text-gray-600 whitespace-pre-line">{company.address}</p>
          )}
          {company?.email && <p className="text-sm text-gray-600">{company.email}</p>}
          {company?.phone && <p className="text-sm text-gray-600">{company.phone}</p>}
        </div>

        {/* Document Details */}
        <div className="text-right">
          <h1 className="text-3xl font-bold text-purple-600">{documentLabel}</h1>
          {documentNumber && (
            <p className="mt-1 text-sm font-semibold text-gray-700">#{documentNumber}</p>
          )}
          {documentDate && (
            <div className="mt-4 space-y-1">
              <div className="text-sm">
                <span className="font-semibold text-gray-700">Date: </span>
                <span className="text-gray-600">{formatDate(documentDate)}</span>
              </div>
              {dueDate && (
                <div className="text-sm">
                  <span className="font-semibold text-gray-700">Due: </span>
                  <span className="text-gray-600">{formatDate(dueDate)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Client Info */}
      {client && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Bill To
          </h3>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">{client.name}</p>
            {client.companyName && (
              <p className="text-sm text-gray-700">{client.companyName}</p>
            )}
            {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
            {client.address && (
              <p className="text-sm text-gray-600 whitespace-pre-line">{client.address}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
