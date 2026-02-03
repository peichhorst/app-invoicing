'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const ApiDocs = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">API Reference Documentation</h2>
      
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('authentication')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'authentication'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Authentication
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'opportunities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Opportunities API
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices API
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">API Overview</h3>
            <p className="text-gray-600 mb-4">
              The ClientWave API provides programmatic access to your account data, allowing you to integrate 
              with third-party applications, automate processes, and extend the functionality of the platform.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-gray-700 font-medium">Base URL:</p>
              <code className="text-sm bg-gray-800 text-gray-100 p-2 rounded block mt-1 overflow-x-auto">
                https://api.clientwave.app/v1
              </code>
            </div>
            <p className="text-gray-600">
              The API uses REST principles and returns JSON responses. All requests must be made over HTTPS.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">API Versioning</h3>
            <p className="text-gray-600 mb-4">
              The API is versioned using the URL path. The current version is v1. We will maintain backward 
              compatibility within a major version, but may introduce breaking changes in future major versions.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Note: Always specify the API version in your requests to avoid unexpected behavior when we release updates.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Rate Limits</h3>
            <p className="text-gray-600 mb-4">
              To ensure fair usage and optimal performance for all users, the API enforces rate limits:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Requests are limited to 1000 per hour per API key</li>
              <li>Burst limit of 100 requests per minute</li>
              <li>Exceeded requests will return HTTP 429 status code</li>
            </ul>
          </section>
        </div>
      )}

      {activeTab === 'authentication' && (
        <div>
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Authentication</h3>
            <p className="text-gray-600 mb-4">
              The API uses API keys for authentication. Each request must include your API key in the Authorization header.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <code className="text-sm bg-gray-800 text-gray-100 p-2 rounded block overflow-x-auto">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Getting Your API Key</h3>
            <ol className="list-decimal pl-6 space-y-2 text-gray-600">
              <li>Login to your ClientWave account</li>
              <li>Navigate to Settings → API Keys</li>
              <li>Click "Create New API Key"</li>
              <li>Give your key a descriptive name</li>
              <li>Copy the generated API key (you won't be able to see it again)</li>
            </ol>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Example Request</h3>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              {`curl -X GET https://api.clientwave.app/v1/opportunities \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
            </pre>
          </section>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div>
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Opportunities API</h3>
            <p className="text-gray-600 mb-4">
              Manage sales opportunities in your pipeline with these endpoints.
            </p>
          </section>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">GET /opportunities</h4>
            <p className="text-gray-600 mb-2">Retrieve a list of opportunities</p>
            <div className="mt-2">
              <h5 className="font-medium text-gray-700">Query Parameters:</h5>
              <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                <li><code>page</code>: Page number (default: 1)</li>
                <li><code>limit</code>: Items per page (default: 20, max: 100)</li>
                <li><code>stage</code>: Filter by stage (e.g., prospect, qualified, won)</li>
                <li><code>value_min</code>: Minimum opportunity value</li>
                <li><code>value_max</code>: Maximum opportunity value</li>
                <li><code>q</code>: Search term for title or description</li>
              </ul>
            </div>
            <div className="mt-3">
              <h5 className="font-medium text-gray-700">Example:</h5>
              <code className="text-xs bg-gray-800 text-gray-100 p-2 rounded block mt-1 overflow-x-auto">
                GET /v1/opportunities?page=1&limit=10&stage=qualified
              </code>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">POST /opportunities</h4>
            <p className="text-gray-600 mb-2">Create a new opportunity</p>
            <div className="mt-2">
              <h5 className="font-medium text-gray-700">Request Body:</h5>
              <pre className="text-xs bg-gray-800 text-gray-100 p-2 rounded mt-1 overflow-x-auto">
                {`{
  "title": "Website redesign project",
  "clientId": "client_abc123",
  "value": 5000,
  "currency": "USD",
  "probability": 60,
  "stage": "prospect",
  "source": "referral",
  "priority": "high",
  "estimatedCloseDate": "2023-12-31",
  "description": "Complete website redesign for client"
}`}
              </pre>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">PUT /opportunities/{'{id}'}</h4>
            <p className="text-gray-600 mb-2">Update an existing opportunity</p>
            <div className="mt-2">
              <h5 className="font-medium text-gray-700">Request Body:</h5>
              <p className="text-sm text-gray-600">Same as create, but all fields are optional</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">DELETE /opportunities/{'{id}'}</h4>
            <p className="text-gray-600 mb-2">Delete an opportunity</p>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div>
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Invoices API</h3>
            <p className="text-gray-600 mb-4">
              Manage invoices with these endpoints.
            </p>
          </section>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">GET /invoices</h4>
            <p className="text-gray-600 mb-2">Retrieve a list of invoices</p>
            <div className="mt-2">
              <h5 className="font-medium text-gray-700">Query Parameters:</h5>
              <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                <li><code>page</code>: Page number (default: 1)</li>
                <li><code>limit</code>: Items per page (default: 20, max: 100)</li>
                <li><code>status</code>: Filter by status (e.g., draft, sent, paid)</li>
                <li><code>client_id</code>: Filter by client ID</li>
                <li><code>date_from</code>: Filter from date (YYYY-MM-DD)</li>
                <li><code>date_to</code>: Filter to date (YYYY-MM-DD)</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">POST /invoices</h4>
            <p className="text-gray-600 mb-2">Create a new invoice</p>
            <div className="mt-2">
              <h5 className="font-medium text-gray-700">Request Body:</h5>
              <pre className="text-xs bg-gray-800 text-gray-100 p-2 rounded mt-1 overflow-x-auto">
                {`{
  "clientId": "client_abc123",
  "title": "Web development services",
  "issueDate": "2023-11-01",
  "dueDate": "2023-12-01",
  "items": [
    {
      "name": "Website design",
      "description": "Design of 5 responsive pages",
      "quantity": 1,
      "unitPrice": 2000
    }
  ],
  "notes": "Thank you for your business!",
  "sendEmail": true
}`}
              </pre>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">POST /invoices/{'{id}'}/send</h4>
            <p className="text-gray-600 mb-2">Send an invoice to the client</p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Integration Resources</h3>
        
        <div className="mb-4">
          <h4 className="font-medium text-gray-800 mb-2">SDKs and Libraries</h4>
          <p className="text-gray-600 mb-3">
            We provide SDKs in several languages to make integration easier:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>JavaScript/Node.js</li>
            <li>Python</li>
            <li>Ruby</li>
            <li>PHP</li>
            <li>Java</li>
          </ul>
          <div className="mt-2">
            <a 
              href="https://github.com/clientwave/api-sdks" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
            >
              View SDKs on GitHub
            </a>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Related Documentation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/docs/opportunities" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Opportunity Management API</div>
              <div className="text-sm text-gray-600">Manage sales opportunities programmatically</div>
            </Link>
            <Link href="/docs/invoices" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Invoice Management API</div>
              <div className="text-sm text-gray-600">Create and manage invoices via API</div>
            </Link>
            <Link href="/docs/proposals" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Proposal System API</div>
              <div className="text-sm text-gray-600">Generate and track proposals programmatically</div>
            </Link>
            <Link href="/docs/templates" className="block p-3 border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50">
              <div className="font-medium">Template Management API</div>
              <div className="text-sm text-gray-600">Customize document templates via API</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;