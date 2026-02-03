'use client';

import React from 'react';
import Link from 'next/link';

const ClientsDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Client Management Documentation</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">What is Client Management?</h3>
        <p className="text-gray-600 mb-4">
          Client management is the foundation of your business relationships. Our system allows you to 
          store and organize all client information in one place, making it easy to track interactions, 
          manage opportunities, and maintain strong relationships.
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
                Tip: Keep client information up-to-date to ensure accurate communications and effective relationship management.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Client Information</h3>
        <p className="text-gray-600 mb-4">
          Our system captures comprehensive client information:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Primary Details</h4>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              <li>Contact name and title</li>
              <li>Company name and industry</li>
              <li>Business address</li>
              <li>Phone numbers</li>
              <li>Email addresses</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Additional Info</h4>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              <li>Preferred contact method</li>
              <li>Business size and revenue</li>
              <li>Decision maker information</li>
              <li>Relationship history</li>
              <li>Communication preferences</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Adding New Clients</h3>
        <ol className="list-decimal pl-6 space-y-2 text-gray-600">
          <li>Navigate to the Clients section in your dashboard</li>
          <li>Click "Add New Client"</li>
          <li>Enter primary contact information</li>
          <li>Add company details and additional contacts if applicable</li>
          <li>Include relevant notes about the client relationship</li>
          <li>Save the client record</li>
        </ol>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Client Segmentation</h3>
        <p className="text-gray-600 mb-4">
          Organize your clients with tags and categories for better management:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">By Industry:</h4>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              <li>Tech & SaaS</li>
              <li>Healthcare</li>
              <li>Finance</li>
              <li>Retail</li>
              <li>Manufacturing</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">By Size:</h4>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              <li>Enterprise</li>
              <li>Mid-Market</li>
              <li>SMB</li>
              <li>Startup</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/opportunities" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Opportunity Management</div>
              <div className="text-sm text-gray-600">Track opportunities with clients</div>
            </Link>
            <Link href="/docs/invoices" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Invoice Management</div>
              <div className="text-sm text-gray-600">Send invoices to clients</div>
            </Link>
            <Link href="/docs/proposals" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Proposal System</div>
              <div className="text-sm text-gray-600">Create proposals for clients</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Manage clients programmatically</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsDocs;