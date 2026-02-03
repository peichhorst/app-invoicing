'use client';

import React from 'react';
import Link from 'next/link';

const CreatingOpportunitiesDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Creating Opportunities</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Getting Started</h3>
        <p className="text-gray-600 mb-4">
          Creating a new opportunity is the first step in your sales process. A well-defined opportunity 
          sets the foundation for a successful sale and helps you track the deal through your pipeline.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Step-by-Step Process</h3>
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <span className="text-blue-800 text-sm font-medium">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Select Client</h4>
              <p className="text-gray-600">
                Choose an existing client from your database or create a new client record. 
                Having accurate client information is crucial for effective opportunity management.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <span className="text-blue-800 text-sm font-medium">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Define Opportunity Details</h4>
              <p className="text-gray-600">
                Enter the opportunity title, description, and estimated value. Be as specific as possible 
                about what the client is looking for and how you plan to serve them.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <span className="text-blue-800 text-sm font-medium">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Set Probability and Timeline</h4>
              <p className="text-gray-600">
                Estimate the probability of winning the deal (0-100%) and set an expected close date. 
                These metrics help with forecasting and prioritization.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <span className="text-blue-800 text-sm font-medium">4</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Assign Stage and Priority</h4>
              <p className="text-gray-600">
                Set the initial stage (usually "Prospect") and priority level. This helps organize 
                your pipeline and ensures important opportunities get proper attention.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <span className="text-blue-800 text-sm font-medium">5</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">Add Tags and Notes</h4>
              <p className="text-gray-600">
                Include relevant tags for categorization and any important notes about the opportunity. 
                This information helps with searching and provides context for your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Best Practices</h3>
        <ul className="list-disc pl-6 space-y-2 text-gray-600">
          <li>Always link opportunities to the correct client record</li>
          <li>Set realistic probability percentages based on available information</li>
          <li>Update opportunity details regularly as you learn more</li>
          <li>Include detailed notes about client interactions and preferences</li>
          <li>Use consistent tagging to enable effective searching</li>
        </ul>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/opportunities/searching" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Searching & Filtering</div>
              <div className="text-sm text-gray-600">Find and organize your opportunities</div>
            </Link>
            <Link href="/docs/opportunities/pipeline" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Pipeline Management</div>
              <div className="text-sm text-gray-600">Track opportunities through the sales process</div>
            </Link>
            <Link href="/docs/clients" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Client Management</div>
              <div className="text-sm text-gray-600">Manage client information</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Create opportunities programmatically</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatingOpportunitiesDocs;