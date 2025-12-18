import React from 'react';

interface PaymentTermsFooterProps {
  paymentTerms?: string;
  notes?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
    bankName?: string;
  };
  documentType?: 'invoice' | 'proposal';
}

export default function PaymentTermsFooter({
  paymentTerms,
  notes,
  bankDetails,
  documentType = 'invoice',
}: PaymentTermsFooterProps) {
  const defaultTerms = documentType === 'invoice' 
    ? 'Payment due within 30 days' 
    : 'This proposal is valid for 30 days from the date above';

  return (
    <div className="space-y-6 border-t border-gray-200 pt-6">
      {/* Payment Terms */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          {documentType === 'invoice' ? 'Payment Terms' : 'Terms'}
        </h3>
        <p className="text-sm text-gray-600">{paymentTerms || defaultTerms}</p>
      </div>

      {/* Bank Details */}
      {bankDetails && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Bank Details
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            {bankDetails.bankName && (
              <p>
                <span className="font-medium">Bank: </span>
                {bankDetails.bankName}
              </p>
            )}
            {bankDetails.accountName && (
              <p>
                <span className="font-medium">Account Name: </span>
                {bankDetails.accountName}
              </p>
            )}
            {bankDetails.accountNumber && (
              <p>
                <span className="font-medium">Account Number: </span>
                {bankDetails.accountNumber}
              </p>
            )}
            {bankDetails.routingNumber && (
              <p>
                <span className="font-medium">Routing Number: </span>
                {bankDetails.routingNumber}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Notes
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{notes}</p>
        </div>
      )}

      {/* Thank You */}
      <div className="text-center pt-4">
        <p className="text-sm font-medium text-gray-500">
          Thank you for your business!
        </p>
      </div>
    </div>
  );
}
