export function StripeConnectGuide() {
  return (
    <section className="w-full rounded-2xl border border-brand-primary-200 bg-gradient-to-br from-brand-primary-100/80 via-brand-primary-50 to-brand-primary-100 p-6 shadow-lg shadow-brand-primary-100">
      <div className="space-y-3">
         <p className="text-xs uppercase tracking-[0.4em] text-brand-primary-600">
          Keep your payments pro:
          <br />
          fast payouts, clean compliance, no extra fees
        </p>
        <h2 className="text-xl font-semibold text-zinc-900">Stripe Setup Instructions</h2>
       
        <p className="text-sm text-zinc-700">
          Accept Credit Cards, Apple Pay, and Google Pay directly on your invoices. Funds land in your Stripe balance instantly.
          <br />
       
        </p>
        <div className="rounded-xl border border-brand-primary-200 bg-white/80 p-3 text-[0.7rem] text-brand-primary-700">
          <p className="font-semibold">Key Info:</p>
          <ul className="mt-1 space-y-1 list-disc pl-4">
            <li>Standard Stripe rate: 2.9% + 30¢ per transaction</li>
            <li>Payouts: 2 business days to your bank (instant +1% anytime)</li>
            <li>Stripe handles all tax forms &amp; compliance automatically</li>
            <li>No SSN or approval delay needed to start</li>
            <li>Your $9.99/mo stays 100% yours — Stripe only takes the card fee</li>
          </ul>
        </div>
        <p className="text-sm text-zinc-700 font-semibold">How to Connect Stripe (2 steps — 30 seconds)</p>
        <p className="text-sm text-zinc-700">
          Paste your Publishable Key and Connect Account ID below to enable card payments instantly.
        </p>
        <ol className="space-y-2 text-sm text-zinc-700 list-decimal pl-5">
          <li className="space-y-1">
            <strong>Get your Publishable Key:</strong><br />
            <span>Dashboard → Developers → API Keys</span><br />
            <span>Copy the key starting with <code>pk_live_</code> (or <code>pk_test_</code>).</span>
          </li>
          <li className="space-y-1">
            <strong>Get your Connect Account ID:</strong><br />
            <span>Connect → Settings</span><br />
            <span>Copy the ID starting with <code>acct_</code>.</span>
          </li>
        </ol>
        <p className="text-sm text-zinc-700">
          Paste both below and hit Save — card payments go live instantly.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-white/80 p-4 text-xs text-zinc-500">
          <p className="font-semibold text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400">
            Connected accounts &amp; webhooks
          </p>
          <p className="mt-2 text-[0.7rem] text-zinc-600">
            For <strong>Standard</strong> Stripe accounts, Stripe does not allow platforms to create webhooks on their behalf, so automated webhook registration is skipped by the app. You still receive the same events (payment_intent.*, checkout.session.*) at your company webhook (`{process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app'}/api/stripe/webhook`), but if you want them to show up inside your Stripe dashboard you must manually add a webhook in Stripe (Developers → Webhooks → New endpoint) pointing at that same URL with the enabled events list above.
          </p>
        </div>
      </div>
    </section>
  );
}
