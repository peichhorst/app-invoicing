import Link from 'next/link';

export const metadata = {
  title: 'End-User License Agreement',
  description: 'EULA for QuickBooks Integration',
};

export default function EndUserLicenseAgreementPage() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold mb-6">End-User License Agreement (EULA) for QuickBooks Integration</h1>
      <p className="mb-4">This End-User License Agreement (“Agreement”) is a legal agreement between you (“User”) and [Your Company Name] (“Company”) regarding the use of the QuickBooks integration feature (“Integration”) provided through our application.</p>
      <ol className="list-decimal pl-6 space-y-2 mb-6">
        <li><b>Acceptance of Terms</b><br />By connecting your QuickBooks account to our application, you agree to be bound by this Agreement.</li>
        <li><b>License Grant</b><br />Company grants you a limited, non-exclusive, non-transferable license to use the Integration solely for your internal business purposes.</li>
        <li><b>User Responsibilities</b><br />You are responsible for maintaining the confidentiality of your QuickBooks credentials. You agree not to misuse the Integration or use it for any unlawful purpose.</li>
        <li><b>Data Access and Use</b><br />The Integration will access your QuickBooks data only as necessary to provide the requested features. Your data will be handled in accordance with our Privacy Policy.</li>
        <li><b>Third-Party Services</b><br />The Integration relies on QuickBooks Online, a service provided by Intuit Inc. Your use of QuickBooks is subject to Intuit’s terms and policies.</li>
        <li><b>Disclaimer of Warranties</b><br />The Integration is provided “as is” without warranty of any kind. Company disclaims all warranties, express or implied, including but not limited to merchantability and fitness for a particular purpose.</li>
        <li><b>Limitation of Liability</b><br />In no event shall Company be liable for any damages arising from the use or inability to use the Integration.</li>
        <li><b>Termination</b><br />Company may terminate your access to the Integration at any time for any reason.</li>
        <li><b>Changes to Agreement</b><br />Company reserves the right to modify this Agreement at any time. Continued use of the Integration constitutes acceptance of any changes.</li>
        <li><b>Contact</b><br />For questions about this Agreement, contact us at [Your Contact Email].</li>
      </ol>
      <Link href="/" className="text-brand-primary-600 hover:underline">Back to Home</Link>
    </div>
  );
}
