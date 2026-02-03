'use client';

import React from 'react';
import Link from 'next/link';

const DocsPage = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Documentation Overview</h2>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Welcome to ClientWave Documentation</h3>
        <p className="text-gray-600 mb-4">
          This documentation provides comprehensive guides and references for using the ClientWave platform.
          Whether you're a new user getting started or an experienced user looking for advanced features,
          you'll find the information you need here.
        </p>
        <p className="text-gray-600">
          ClientWave is a complete business management solution that helps you manage clients,
          opportunities, invoices, proposals, and contracts all in one place.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Getting Started</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Quick Start Guide</h4>
            <p className="text-gray-600 mb-3">
              Learn how to set up your account and create your first client, opportunity, and invoice.
            </p>
            <Link href="/docs/getting-started" className="text-blue-600 hover:underline">
              Start here &rarr;
            </Link>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Video Tutorials</h4>
            <p className="text-gray-600 mb-3">
              Watch step-by-step videos showing how to use key features of ClientWave.
            </p>
            <Link href="/docs/videos" className="text-blue-600 hover:underline">
              Watch tutorials &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Core Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Opportunity Management</h4>
            <p className="text-gray-600 mb-3">
              Track sales opportunities from initial contact to closed deal with our pipeline management system.
            </p>
            <div className="space-y-1">
              <Link href="/docs/opportunities" className="block text-blue-600 hover:underline">
                Overview &rarr;
              </Link>
              <Link href="/docs/opportunities/creating" className="block text-blue-600 hover:underline">
                Creating Opportunities &rarr;
              </Link>
              <Link href="/docs/opportunities/searching" className="block text-blue-600 hover:underline">
                Searching & Filtering &rarr;
              </Link>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Invoicing</h4>
            <p className="text-gray-600 mb-3">
              Create and send professional invoices with customizable templates and payment tracking.
            </p>
            <div className="space-y-1">
              <Link href="/docs/invoices" className="block text-blue-600 hover:underline">
                Overview &rarr;
              </Link>
              <Link href="/docs/invoices/creating" className="block text-blue-600 hover:underline">
                Creating Invoices &rarr;
              </Link>
              <Link href="/docs/invoices/templates" className="block text-blue-600 hover:underline">
                Invoice Templates &rarr;
              </Link>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Proposals & Contracts</h4>
            <p className="text-gray-600 mb-3">
              Design and send beautiful proposals and contracts with e-signature capabilities.
            </p>
            <div className="space-y-1">
              <Link href="/docs/proposals" className="block text-blue-600 hover:underline">
                Overview &rarr;
              </Link>
              <Link href="/docs/proposals/templates" className="block text-blue-600 hover:underline">
                Proposal Templates &rarr;
              </Link>
              <Link href="/docs/contracts" className="block text-blue-600 hover:underline">
                Contract Management &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Support Center</h4>
            <p className="text-gray-600 mb-3">
              Find answers to common questions and troubleshooting guides.
            </p>
            <Link href="/docs/support" className="text-blue-600 hover:underline">
              Visit support &rarr;
            </Link>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Contact Us</h4>
            <p className="text-gray-600 mb-3">
              Reach out to our team for personalized assistance.
            </p>
            <Link href="/docs/contact" className="text-blue-600 hover:underline">
              Contact us &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DocsPage;

