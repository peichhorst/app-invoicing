'use client';

import React from 'react';
import Link from 'next/link';

const ContractsDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Contract Management Documentation</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">What are Contracts?</h3>
        <p className="text-gray-600 mb-4">
          Contracts are legally binding agreements between you and your clients that outline the terms, 
          conditions, and obligations of a project. Our contract system allows you to create, send, 
          and manage contracts with electronic signature capabilities.
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
                Tip: Always have contracts reviewed by a legal professional before sending to clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Contract Types</h3>
        <p className="text-gray-600 mb-4">
          Our system supports various contract types:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Fixed Price</h4>
            <p className="text-gray-600 text-sm">
              Agreed upon price for a defined scope of work.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Time & Materials</h4>
            <p className="text-gray-600 text-sm">
              Billing based on actual hours worked and materials used.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Retainer</h4>
            <p className="text-gray-600 text-sm">
              Prepaid agreement for ongoing services over a period.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Subscription</h4>
            <p className="text-gray-600 text-sm">
              Recurring payment agreement for continued services.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Creating Contracts</h3>
        <ol className="list-decimal pl-6 space-y-2 text-gray-600">
          <li>Select a client from your client list</li>
          <li>Choose a contract template that fits your needs</li>
          <li>Customize the terms and conditions</li>
          <li>Define scope, timeline, and payment terms</li>
          <li>Send for electronic signature</li>
        </ol>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Electronic Signatures</h3>
        <p className="text-gray-600 mb-4">
          Our system supports secure electronic signatures that are legally binding:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>Secure signing process with audit trail</li>
          <li>Email notifications for signature requests</li>
          <li>Automatic completion notifications</li>
          <li>Downloadable signed copies</li>
        </ul>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Link 
            href="/docs/contracts/templates" 
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Contract Templates</div>
            <div className="text-sm text-gray-600 mt-1">Learn how to customize contract templates</div>
          </Link>
          <Link 
            href="/docs/contracts/signing" 
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Signature Process</div>
            <div className="text-sm text-gray-600 mt-1">Guide to electronic signing workflow</div>
          </Link>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/proposals" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Proposal Management</div>
              <div className="text-sm text-gray-600">Connect contracts to accepted proposals</div>
            </Link>
            <Link href="/docs/opportunities" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Opportunity Tracking</div>
              <div className="text-sm text-gray-600">Track contract opportunities</div>
            </Link>
            <Link href="/docs/invoices" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Invoice Generation</div>
              <div className="text-sm text-gray-600">Bill based on contract terms</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Programmatically manage contracts</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractsDocs;