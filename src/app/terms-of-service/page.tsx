import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - ClientWave',
  description: 'Terms of Service for ClientWave',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-white px-8 py-10 shadow-sm">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mb-8 text-sm text-gray-600">Last updated: February 17, 2026</p>

          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Agreement to Terms</h2>
              <p className="text-gray-700">
                By accessing or using ClientWave, you agree to these Terms of Service. If you do not agree,
                do not use the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Service Overview</h2>
              <p className="text-gray-700">
                ClientWave provides tools for invoicing, client management, proposals, contracts, messaging,
                and related business workflows. Features may change over time to improve reliability, security,
                and performance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Account Responsibilities</h2>
              <ul className="list-disc pl-6 text-gray-700">
                <li>You are responsible for account credentials and activity under your account.</li>
                <li>You must provide accurate account and billing information.</li>
                <li>You must promptly notify us of unauthorized access or security incidents.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Acceptable Use</h2>
              <p className="text-gray-700">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Use the service for unlawful, fraudulent, or abusive activity.</li>
                <li>Interfere with platform security, availability, or integrity.</li>
                <li>Upload content that infringes intellectual property rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Billing and Subscription</h2>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Paid plans renew according to your selected billing cycle unless canceled.</li>
                <li>You authorize us and our payment processors to charge applicable fees and taxes.</li>
                <li>Plan changes and cancellations take effect according to your billing settings.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Data and Privacy</h2>
              <p className="text-gray-700">
                Your use of ClientWave is also governed by our Privacy Policy. You retain ownership of your
                business data, and you grant us the rights needed to host, process, and transmit that data to
                provide the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Third-Party Services</h2>
              <p className="text-gray-700">
                ClientWave may integrate with third-party services (for example payment or calendar providers).
                Their terms and policies apply to your use of those services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Termination</h2>
              <p className="text-gray-700">
                We may suspend or terminate access for material violations of these terms or for behavior that
                threatens system security. You may stop using the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Disclaimer and Limitation of Liability</h2>
              <p className="text-gray-700">
                The service is provided on an &quot;as is&quot; basis to the maximum extent permitted by law. We are not
                liable for indirect, incidental, special, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Changes to Terms</h2>
              <p className="text-gray-700">
                We may update these Terms of Service periodically. Continued use of ClientWave after updates
                become effective constitutes acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Contact</h2>
              <p className="text-gray-700">
                Questions about these terms can be sent to:
              </p>
              <p className="mt-2 text-gray-700">
                <strong>Email:</strong> legal@clientwave.app<br />
                <strong>Website:</strong> https://www.clientwave.app
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
