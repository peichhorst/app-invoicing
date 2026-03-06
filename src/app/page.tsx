import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import ZoomableScreenshot from '@/components/landing/ZoomableScreenshot';

const features = [
  'Professional Invoicing with Your Branding',
  'Proposals & Contracts with E-signature',
  'Recurring Billing & Auto-charge',
  'Installable Web App',
  'Client CRM, Leads, and Pipeline Tracking',
  'Booking Scheduler and Availability Sharing',
  'Stripe, Venmo, Zelle, and Check Options',
  'Team Messaging, Reporting, and Automations',
  'AI Chat Assistant for Invoices and Workflows',
  'Google Calendar Sync for Bookings',
  'Custom Branding: Logo, Color, and Header Control',
  'Client Portal with Public Payment and Document Links',
  'CSV Export for Invoices, Clients, and Leads',
  'Email Notifications, Reminders, and Receipts',
  'Role-based Team Access and Admin Controls',
];

const benefitCards = [
  {
    title: 'Lead To Cash',
    body: 'Capture leads, send proposals, sign contracts, and invoice from one workflow.',
    tone: 'bg-[#fef3c7] border-amber-200',
  },
  {
    title: 'Get Paid Faster',
    body: 'Accept card, Venmo, Zelle, and check payments with clear status tracking.',
    tone: 'bg-[#dbeafe] border-blue-200',
  },
  {
    title: 'Stay Organized',
    body: 'Centralize client history, notes, resources, and communication in one place.',
    tone: 'bg-[#dcfce7] border-emerald-200',
  },
];

const useCases = [
  'Photographers',
  'Design Studios',
  'Consultants',
  'Coaches',
  'Marketing Teams',
  'Home Services',
  'Event Planners',
  'Virtual Assistants',
  'Web Developers',
  'Copywriters',
  'Personal Trainers',
  'Legal Services',
  'Bookkeepers',
  'Real Estate Teams',
  'Wedding Professionals',
  'Video Production Teams',
  'Interior Designers',
  'Tutors',
];

const footerColumns = [
  {
    title: 'Product',
    links: ['Invoices', 'Proposals', 'Contracts', 'Scheduling', 'Payments'],
  },
  {
    title: 'Company',
    links: ['About', 'Contact', 'Privacy Policy', 'Terms of Service'],
  },
  {
    title: 'Resources',
    links: ['Docs', 'API Reference', 'FAQ', 'Support'],
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const primaryHref = user ? '/dashboard' : '/login';
  const primaryLabel = user ? 'Go to Dashboard' : 'Login / Register';

  return (
    <div className="min-h-[calc(100vh-85px)] w-full -mt-px pt-px bg-[#d8e6f2] text-zinc-900">
      <section className="bg-[#d8e6f2]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-zinc-900/20 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700">
                30 Day Pro Trial
              </span>
              <h1 className="text-4xl font-black leading-[0.95] tracking-tight text-zinc-900 sm:text-6xl">
                The All-in-one Business App For Freelancers and Agencies.
              </h1>
              <p className="max-w-xl text-base text-zinc-800 sm:text-lg">
                ClientWave helps you run sales, operations, and billing from one place so you can spend less time managing tools and more time serving clients.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={primaryHref}
                  className="btn-ui btn-ui-primary btn-ui-lg inline-flex items-center justify-center text-sm shadow-sm"
                >
                  {primaryLabel}
                </Link>
              </div>
            </div>

            <div className="relative lg:mt-12">
              <ZoomableScreenshot
                src="/screenshot-dashboard.png"
                alt="ClientWave workspace screenshot"
                width={1400}
                height={900}
                priority
                frameClassName="border-zinc-900/20 shadow-2xl"
              />
              <div className="pointer-events-none absolute -bottom-3 -left-3 h-20 w-20 rounded-2xl bg-sky-200/70 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
              <ul className="grid gap-2 text-sm font-semibold text-zinc-800 sm:grid-cols-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-green-600">{String.fromCharCode(10003)}</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">Why ClientWave?</h2>
              <p className="text-base text-zinc-700 sm:text-lg">
                Built for service businesses that need one practical system for sales, delivery, and getting paid.
                ClientWave keeps your team aligned while giving clients a smooth experience.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {benefitCards.map((card) => (
                  <div key={card.title} className={`rounded-xl border p-3 ${card.tone}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Benefit</p>
                    <p className="mt-1 text-base font-bold text-zinc-900">{card.title}</p>
                    <p className="mt-1 text-sm text-zinc-700">{card.body}</p>
                  </div>
                ))}
              </div>
              <div>
                <Link
                  href={primaryHref}
                  className="btn-ui btn-ui-primary btn-ui-lg inline-flex items-center justify-center text-sm shadow-sm"
                >
                  {primaryLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0b1f2f] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Everything You Need</p>
              <h3 className="text-3xl font-black leading-tight">From your first lead to final payment.</h3>
              <p className="max-w-md text-sm text-zinc-200">
                Replace disconnected apps with one connected workspace for sales, invoicing, team collaboration, and reporting.
              </p>
            </div>
            <div className="grid gap-2 text-3xl font-light leading-tight text-zinc-100 sm:grid-cols-2">
              <p>Lead Forms</p>
              <p>Proposals</p>
              <p>Contracts</p>
              <p>Invoices</p>
              <p>Payments</p>
              <p>Scheduling</p>
              <p>Automations</p>
              <p>Finances</p>
              <p>Integrations</p>
              <p>Team Inbox</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f3efe7]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="space-y-6 text-center">
            <h3 className="text-3xl font-black text-zinc-900">Built For Anyone With Clients.</h3>
            <p className="mx-auto max-w-2xl text-sm text-zinc-700">
              Whether you work solo or with a team, ClientWave helps you streamline operations and present a professional client experience.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <div key={useCase} className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm font-semibold text-zinc-800 shadow-sm">
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#c8d7ea]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600">Founder Story</p>
              <h3 className="text-3xl font-black text-zinc-900">Designed by people who run real service businesses.</h3>
              <p className="text-sm text-zinc-700">
                We built ClientWave to reduce busywork and speed up cash flow for independent professionals and growing teams.
              </p>
              <p className="text-sm font-semibold text-zinc-800">Trusted by teams across creative, consulting, and home-service industries.</p>
            </div>
            <ZoomableScreenshot
              src="/screenshot-invoices.png"
              alt="ClientWave team and workspace"
              width={1200}
              height={760}
              frameClassName="border-zinc-300"
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <ZoomableScreenshot
              src="/screenshot-reporting.png"
              alt="ClientWave reporting dashboard"
              width={1200}
              height={760}
              frameClassName="border-zinc-200"
            />
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600">Reporting</p>
              <h3 className="text-3xl font-black text-zinc-900">See business performance at a glance.</h3>
              <p className="text-sm text-zinc-700">
                Track revenue trends, payment outcomes, clients and team activity from a single dashboard so you can make faster decisions.
              </p>
              <p className="text-sm font-semibold text-zinc-800">
                Built-in reporting gives you visibility of your business revenue..
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0b1f2f] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="p-8 text-center">
            <h3 className="text-3xl font-black">Be one of the first to join the ClientWave.</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-200">
              Start your 30-day Pro trial and begin streamlining your business.
            </p>
            <div className="mt-6">
              <Link
                href={primaryHref}
                className="btn-ui btn-ui-primary btn-ui-lg inline-flex items-center justify-center text-sm shadow-sm"
              >
                {primaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="space-y-3">
              <p className="text-2xl font-black text-zinc-900">ClientWave</p>
              <p className="text-sm text-zinc-600">
                Business management suite for freelancers, agencies, and service teams.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Product</p>
              <p className="text-sm text-zinc-700">Invoices</p>
              <p className="text-sm text-zinc-700">Proposals</p>
              <p className="text-sm text-zinc-700">Contracts</p>
              <p className="text-sm text-zinc-700">Scheduling</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Company</p>
              <p className="text-sm text-zinc-700">About</p>
              <p className="text-sm text-zinc-700">Contact</p>
              <Link href="/privacy-policy" className="block text-sm text-zinc-700 hover:underline">Privacy Policy</Link>
              <Link href="/terms-of-service" className="block text-sm text-zinc-700 hover:underline">Terms of Service</Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Resources</p>
              <Link href="/docs" className="block text-sm text-zinc-700 hover:underline">Documentation</Link>
              <Link href="/docs/faq" className="block text-sm text-zinc-700 hover:underline">FAQ</Link>
              <Link href="/contact" className="block text-sm text-zinc-700 hover:underline">Support</Link>
              <p className="text-sm text-zinc-700">API Reference</p>
            </div>
          </div>
          <div className="mt-8 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
            © {new Date().getFullYear()} ClientWave. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
