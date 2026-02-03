'use client';

import React from 'react';
import Link from 'next/link';

const ProposalsDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Proposals Documentation</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">What are Proposals?</h3>
        <p className="text-gray-600 mb-4">
          Proposals are professional documents sent to prospects outlining your services, timeline, 
          and pricing for potential projects. Our proposal system allows you to create beautiful, 
          customized proposals that convert prospects into clients.
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
                Tip: Use our proposal templates to speed up the creation process while maintaining professionalism.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Proposal Sections</h3>
        <p className="text-gray-600 mb-4">
          Proposals typically contain the following sections:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Executive Summary</h4>
            <p className="text-gray-600 text-sm">
              Brief overview of the project and proposed solution.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Project Scope</h4>
            <p className="text-gray-600 text-sm">
              Detailed description of what will be delivered.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Timeline</h4>
            <p className="text-gray-600 text-sm">
              Project milestones and delivery schedule.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Investment</h4>
            <p className="text-gray-600 text-sm">
              Pricing breakdown and payment terms.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Creating Proposals</h3>
        <ol className="list-decimal pl-6 space-y-2 text-gray-600">
          <li>Select a client from your client list</li>
          <li>Choose a proposal template that fits your needs</li>
          <li>Customize the content with project-specific details</li>
          <li>Add line items for services and costs</li>
          <li>Review and send to the client</li>
        </ol>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Link 
            href="/docs/proposals/templates" 
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Proposal Templates</div>
            <div className="text-sm text-gray-600 mt-1">Learn how to customize proposal templates</div>
          </Link>
          <Link 
            href="/docs/proposals/sending" 
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Sending Proposals</div>
            <div className="text-sm text-gray-600 mt-1">Best practices for sending proposals</div>
          </Link>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/opportunities" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Opportunity Management</div>
              <div className="text-sm text-gray-600">Connect proposals to sales opportunities</div>
            </Link>
            <Link href="/docs/contracts" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Contract Management</div>
              <div className="text-sm text-gray-600">Convert accepted proposals to contracts</div>
            </Link>
            <Link href="/docs/invoices" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Invoice Generation</div>
              <div className="text-sm text-gray-600">Create invoices from completed projects</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Programmatically manage proposals</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalsDocs;