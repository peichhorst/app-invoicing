'use client';

import React from 'react';
import Link from 'next/link';

const SearchingOpportunitiesDocs = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Searching & Filtering Opportunities</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Overview</h3>
        <p className="text-gray-600 mb-4">
          Our powerful search and filtering system allows you to quickly find the opportunities you need. 
          Whether you're looking for high-value prospects or deals that need immediate attention, 
          you can use various criteria to locate them efficiently.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Search Criteria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Basic Filters</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
                <span><strong>Title & Description:</strong> Search keywords in opportunity titles and descriptions</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
                <span><strong>Client Name:</strong> Find opportunities associated with specific clients</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
                <span><strong>Stage:</strong> Filter by sales pipeline stage (Prospect, Qualified, etc.)</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Advanced Filters</h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
                <span><strong>Value Range:</strong> Filter opportunities by estimated value</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
                <span><strong>Probability:</strong> Focus on high-probability or long-shot opportunities</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
                <span><strong>Date Ranges:</strong> Find recent opportunities or those approaching deadlines</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Using Tags</h3>
        <p className="text-gray-600 mb-4">
          Tags provide a flexible way to categorize and organize your opportunities beyond standard filters:
        </p>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="font-semibold text-gray-800 mb-2">Common Tag Categories:</h4>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li><strong>Industry:</strong> tech, healthcare, finance, retail</li>
            <li><strong>Opportunity Type:</strong> new business, renewal, upsell</li>
            <li><strong>Size:</strong> enterprise, mid-market, small business</li>
            <li><strong>Urgency:</strong> urgent, long-term, strategic</li>
          </ul>
        </div>
        <p className="text-gray-600">
          You can combine multiple tags with other filters to create very specific searches.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Sorting Options</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sort By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Value (High to Low)</td>
                <td className="px-6 py-4 text-sm text-gray-500">Focus on highest-value opportunities</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Close Date (Soonest)</td>
                <td className="px-6 py-4 text-sm text-gray-500">Address time-sensitive opportunities first</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Created Date (Newest)</td>
                <td className="px-6 py-4 text-sm text-gray-500">Review recently added opportunities</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Probability (High to Low)</td>
                <td className="px-6 py-4 text-sm text-gray-500">Prioritize deals most likely to close</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Next Steps</h3>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/opportunities/creating" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Creating Opportunities</div>
              <div className="text-sm text-gray-600">How to create new opportunities</div>
            </Link>
            <Link href="/docs/opportunities/pipeline" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Pipeline Management</div>
              <div className="text-sm text-gray-600">Track opportunities through the sales process</div>
            </Link>
            <Link href="/docs/analytics" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Sales Analytics</div>
              <div className="text-sm text-gray-600">Analyze opportunity performance</div>
            </Link>
            <Link href="/docs/api" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">API Reference</div>
              <div className="text-sm text-gray-600">Search opportunities programmatically</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchingOpportunitiesDocs;