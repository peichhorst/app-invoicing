'use client';

import React from 'react';
import Link from 'next/link';

const InvoicesDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Invoice Management Documentation</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">What are Invoices?</h3>
        <p className="text-gray-600 mb-4">
          Invoices are formal requests for payment sent to clients for goods or services provided. 
          Our invoice system allows you to create professional invoices with customizable templates, 
          track payment status, and manage your cash flow efficiently.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Tip: Enable automatic invoice reminders to improve your collection rate.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Invoice Statuses</h3>
        <p className="text-gray-600 mb-4">
          Invoices move through different statuses as they progress:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Draft</h4>
            <p className="text-gray-600 text-sm">
              Invoice is being prepared and hasn't been sent to the client yet.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Sent</h4>
            <p className="text-gray-600 text-sm">
              Invoice has been sent to the client and is awaiting payment.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Paid</h4>
            <p className="text-gray-600 text-sm">
              Full payment has been received for the invoice.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Unpaid</h4>
            <p className="text-gray-600 text-sm">
              Invoice is overdue and payment has not been received.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Partially Paid</h4>
            <p className="text-gray-600 text-sm">
              Partial payment has been received, but balance remains outstanding.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Void</h4>
            <p className="text-gray-600 text-sm">
              Invoice is no longer valid and won't be collected.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Creating Invoices</h3>
        <ol className="list-decimal pl-6 space-y-2 text-gray-600">
          <li>Navigate to the Invoices section and click "Create New Invoice"</li>
          <li>Select a client from your client list</li>
          <li>Add line items with descriptions, quantities, and prices</li>
          <li>Set the issue date and due date</li>
          <li>Review the invoice details and send</li>
        </ol>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Invoice Templates</h3>
        <p className="text-gray-600 mb-4">
          Customize your invoices with professional templates that reflect your brand identity:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>Brand colors and logo placement</li>
          <li>Custom fields and sections</li>
          <li>Multiple layout options</li>
          <li>Industry-specific templates</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Payment Processing</h3>
        <p className="text-gray-600 mb-4">
          Our integrated payment system supports multiple payment methods:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Credit Cards</h4>
            <p className="text-gray-600 text-sm">
              Accept major credit cards directly through your invoices.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Bank Transfer</h4>
            <p className="text-gray-600 text-sm">
              Provide bank details for direct transfers.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Digital Wallets</h4>
            <p className="text-gray-600 text-sm">
              Accept payments through popular digital wallets.
            </p>
          </div>
        </div>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Link 
            href="/invoices/create" 
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Create Your First Invoice</div>
            <div className="text-sm text-gray-600 mt-1">Step-by-step guide to creating your first invoice</div>
          </Link>
          <Link 
            href="/docs/invoices/templates" 
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Customize Invoice Templates</div>
            <div className="text-sm text-gray-600 mt-1">Learn how to create branded invoice templates</div>
          </Link>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/payments" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Payment Processing</div>
              <div className="text-sm text-gray-600">Configure payment methods and gateways</div>
            </Link>
            <Link href="/docs/recurring" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Recurring Invoices</div>
              <div className="text-sm text-gray-600">Set up automated recurring billing</div>
            </Link>
            <Link href="/docs/clients" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Client Management</div>
              <div className="text-sm text-gray-600">Manage client information for invoicing</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Programmatically manage invoices</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicesDocs;