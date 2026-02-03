'use client';

import React from 'react';
import Link from 'next/link';

const TemplatesDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Template Management Documentation</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">What are Templates?</h3>
        <p className="text-gray-600 mb-4">
          Templates are pre-designed layouts and formats that allow you to create consistent, 
          professional documents quickly. Our system supports templates for invoices, proposals, 
          contracts, and other business documents.
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
                Tip: Create multiple templates for different client types or service offerings to maintain consistency while customizing appropriately.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Template Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Invoice Templates</h4>
            <p className="text-gray-600 text-sm">
              Professional invoice layouts with customizable branding, fields, and payment information.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Proposal Templates</h4>
            <p className="text-gray-600 text-sm">
              Persuasive proposal layouts designed to win business with clear structure and compelling content.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Contract Templates</h4>
            <p className="text-gray-600 text-sm">
              Legally sound contract layouts with customizable terms and conditions.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Email Templates</h4>
            <p className="text-gray-600 text-sm">
              Pre-written email templates for common business communications.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Creating Templates</h3>
        <ol className="list-decimal pl-6 space-y-2 text-gray-600">
          <li>Go to the Templates section in your dashboard</li>
          <li>Select the type of template you want to create</li>
          <li>Choose a starting layout from our template gallery</li>
          <li>Customize the design with your branding colors and logo</li>
          <li>Modify text content, add or remove sections as needed</li>
          <li>Save the template and give it a descriptive name</li>
        </ol>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Template Variables</h3>
        <p className="text-gray-600 mb-4">
          Templates support variables that automatically populate with relevant information when generating documents:
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Common Variables:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-700">Client Information:</h5>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li>{'{{client.name}}'}</li>
                <li>{'{{client.company}}'}</li>
                <li>{'{{client.address}}'}</li>
                <li>{'{{client.email}}'}</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700">Document Information:</h5>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li>{'{{document.date}}'}</li>
                <li>{'{{document.number}}'}</li>
                <li>{'{{document.total}}'}</li>
                <li>{'{{business.logo}}'}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/invoices" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Invoice Management</div>
              <div className="text-sm text-gray-600">Create and manage invoices</div>
            </Link>
            <Link href="/docs/proposals" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Proposal System</div>
              <div className="text-sm text-gray-600">Create and send proposals</div>
            </Link>
            <Link href="/docs/contracts" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Contract Management</div>
              <div className="text-sm text-gray-600">Manage contracts and agreements</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Work with templates programmatically</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesDocs;