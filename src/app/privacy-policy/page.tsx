import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - ClientWave',
  description: 'Privacy Policy for ClientWave',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-white px-8 py-10 shadow-sm">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mb-8 text-sm text-gray-600">Last updated: January 3, 2026</p>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Introduction</h2>
              <p className="text-gray-700">
                ClientWave ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-4">Personal Information</h3>
              <p className="text-gray-700">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Name and contact information (email, phone number)</li>
                <li>Business information (company name, website, address)</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Profile photos, logos, and signatures</li>
                <li>Client and invoice data</li>
                <li>Communication preferences and notification settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">Google Calendar Integration</h3>
              <p className="text-gray-700">
                When you connect your Google Calendar, we collect and store:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>OAuth access and refresh tokens (encrypted)</li>
                <li>Your Google Calendar email address</li>
                <li>Permission to create calendar events on your behalf</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-4">Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Usage data and analytics</li>
                <li>Device information and IP address</li>
                <li>Browser type and version</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">How We Use Your Information</h2>
              <p className="text-gray-700">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Provide, maintain, and improve our services</li>
                <li>Process payments and send invoices</li>
                <li>Create and manage calendar events (when authorized)</li>
                <li>Send notifications and service updates</li>
                <li>Respond to your requests and provide customer support</li>
                <li>Analyze usage patterns and optimize performance</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Google Calendar Data Usage</h2>
              <p className="text-gray-700">
                When you connect your Google Calendar, we use your calendar data solely to:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Automatically create calendar events for confirmed bookings</li>
                <li>Add booking attendees to calendar invitations</li>
                <li>Sync your bookings with your Google Calendar</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We do not read, modify, or access any of your existing calendar events. We only create new events based on bookings made through ClientWave. You can disconnect Google Calendar at any time from your profile settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Data Sharing and Disclosure</h2>
              <p className="text-gray-700">We may share your information with:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li><strong>Service Providers:</strong> Stripe (payments), Cloudinary (file storage), email services</li>
                <li><strong>Your Clients:</strong> Information necessary for invoicing and booking confirmations</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We do not sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Data Security</h2>
              <p className="text-gray-700">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Encryption of sensitive data (OAuth tokens, payment information)</li>
                <li>Secure HTTPS connections</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
              </ul>
              <p className="text-gray-700 mt-3">
                However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Your Rights and Choices</h2>
              <p className="text-gray-700">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Access, update, or delete your personal information</li>
                <li>Disconnect Google Calendar integration at any time</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data</li>
                <li>Request deletion of your account and associated data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Data Retention</h2>
              <p className="text-gray-700">
                We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Cookies</h2>
              <p className="text-gray-700">
                We use cookies and similar technologies to maintain sessions, remember preferences, and analyze usage. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Children's Privacy</h2>
              <p className="text-gray-700">
                ClientWave is not intended for users under 18 years of age. We do not knowingly collect information from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Email:</strong> privacy@clientwave.app<br />
                <strong>Website:</strong> https://www.clientwave.app
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Google API Services</h2>
              <p className="text-gray-700">
                ClientWave's use of information received from Google APIs adheres to the{' '}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
