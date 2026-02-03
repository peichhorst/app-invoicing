import React from 'react';
import Link from 'next/link';

const DocsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="lg:flex lg:gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:w-1/4 mb-8 lg:mb-0">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h2>
                <ul className="space-y-2">
                  <li>
                    <Link href="/docs" className="text-blue-600 font-medium block py-1">Overview</Link>
                  </li>
                  <li>
                    <h3 className="font-medium text-gray-700 mt-4 mb-2">Core Features</h3>
                  </li>
                  <li>
                    <Link href="/docs/opportunities" className="text-gray-600 hover:text-blue-600 block py-1">Opportunities</Link>
                  </li>
                  <li>
                    <Link href="/docs/invoices" className="text-gray-600 hover:text-blue-600 block py-1">Invoices</Link>
                  </li>
                  <li>
                    <Link href="/docs/proposals" className="text-gray-600 hover:text-blue-600 block py-1">Proposals</Link>
                  </li>
                  <li>
                    <Link href="/docs/contracts" className="text-gray-600 hover:text-blue-600 block py-1">Contracts</Link>
                  </li>
                  <li>
                    <h3 className="font-medium text-gray-700 mt-4 mb-2">Development</h3>
                  </li>
                  <li>
                    <Link href="/docs/api" className="text-gray-600 hover:text-blue-600 block py-1">API Reference</Link>
                  </li>
                  <li>
                    <Link href="/docs/templates" className="text-gray-600 hover:text-blue-600 block py-1">Templates</Link>
                  </li>
                  <li>
                    <Link href="/docs/integrations" className="text-gray-600 hover:text-blue-600 block py-1">Integrations</Link>
                  </li>
                  <li>
                    <h3 className="font-medium text-gray-700 mt-4 mb-2">Support</h3>
                  </li>
                  <li>
                    <Link href="/docs/faq" className="text-gray-600 hover:text-blue-600 block py-1">FAQ</Link>
                  </li>
                  <li>
                    <Link href="/docs/support" className="text-gray-600 hover:text-blue-600 block py-1">Support</Link>
                  </li>
                </ul>
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:w-3/4">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsLayout;
