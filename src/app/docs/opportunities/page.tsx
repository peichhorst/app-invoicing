'use client';

import React from 'react';
import Link from 'next/link';

const OpportunitiesDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Opportunity Management Overview</h2>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">What are Opportunities?</h3>
        <p className="text-gray-600 mb-4">
          Opportunities represent potential sales in your pipeline. They help you track and manage
          potential deals from initial contact through to closed-won or closed-lost status.
          Each opportunity is associated with a specific client and has attributes like value,
          probability of closing, and expected close date.
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
                Tip: Regularly update opportunity stages and probabilities to maintain accurate sales forecasting.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Opportunity Stages</h3>
        <p className="text-gray-600 mb-4">
          Opportunities progress through several stages in your sales pipeline:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Prospect</h4>
            <p className="text-gray-600 text-sm">
              Initial contact with a potential client. No formal proposal has been made yet.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Qualified</h4>
            <p className="text-gray-600 text-sm">
              The prospect has been qualified and shows genuine interest in your services.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Proposal Sent</h4>
            <p className="text-gray-600 text-sm">
              A formal proposal has been sent to the client for their consideration.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Negotiation</h4>
            <p className="text-gray-600 text-sm">
              The client is negotiating terms, pricing, or other aspects of the deal.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Won</h4>
            <p className="text-gray-600 text-sm">
              The deal has been successfully closed and the client has agreed to proceed.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Lost</h4>
            <p className="text-gray-600 text-sm">
              The client decided not to proceed with the opportunity.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Key Attributes</h3>
        <p className="text-gray-600 mb-4">
          Each opportunity has several important attributes that help you track and manage it effectively:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attribute</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Title</td>
                <td className="px-6 py-4 text-sm text-gray-500">Brief description of the opportunity</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">High</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Value</td>
                <td className="px-6 py-4 text-sm text-gray-500">Estimated deal value in selected currency</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">High</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Probability</td>
                <td className="px-6 py-4 text-sm text-gray-500">Percentage chance of closing the deal (0-100%)</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">High</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Stage</td>
                <td className="px-6 py-4 text-sm text-gray-500">Current position in the sales pipeline</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">High</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Close Date</td>
                <td className="px-6 py-4 text-sm text-gray-500">Expected date when the deal will close</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Medium</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Source</td>
                <td className="px-6 py-4 text-sm text-gray-500">How the opportunity was generated (referral, website, etc.)</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Medium</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Priority</td>
                <td className="px-6 py-4 text-sm text-gray-500">Level of importance (low, medium, high, critical)</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Medium</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Best Practices</h3>
        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>Update opportunity stages regularly to reflect actual progress</li>
          <li>Adjust probability percentages based on new information and client feedback</li>
          <li>Add relevant tags to categorize opportunities by industry, size, or other criteria</li>
          <li>Set realistic close dates and update them as needed</li>
          <li>Track next actions and follow up consistently</li>
          <li>Record important notes and conversations with the client</li>
        </ul>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Link
            href="/docs/opportunities/creating"
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Create Your First Opportunity</div>
            <div className="text-sm text-gray-600 mt-1">Step-by-step guide to creating your first opportunity</div>
          </Link>
          <Link
            href="/docs/opportunities/searching"
            className="block p-4 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50"
          >
            <div className="font-medium">Advanced Search & Filtering</div>
            <div className="text-sm text-gray-600 mt-1">Learn how to find opportunities with powerful filters</div>
          </Link>
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/pipeline" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Pipeline Management</div>
              <div className="text-sm text-gray-600">Track opportunities through the sales pipeline</div>
            </Link>
            <Link href="/docs/analytics" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Sales Analytics</div>
              <div className="text-sm text-gray-600">Analyze opportunity performance and trends</div>
            </Link>
            <Link href="/docs/clients" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Client Management</div>
              <div className="text-sm text-gray-600">Manage client relationships linked to opportunities</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Programmatically manage opportunities</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunitiesDocs;

