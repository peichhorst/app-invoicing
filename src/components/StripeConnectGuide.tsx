export function StripeConnectGuide() {
  return (
    <section className="w-full rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-100/80 via-purple-50 to-purple-100 p-6 shadow-lg shadow-purple-100">
      <div className="space-y-3">
         <p className="text-xs uppercase tracking-[0.4em] text-purple-600">
          Keep your payments pro:
          <br />
          fast payouts, clean compliance, no extra fees
        </p>
        <h2 className="text-xl font-semibold text-zinc-900">Stripe Setup Instructions</h2>
       
        <p className="text-sm text-zinc-700">
          Accept Credit Cards, Apple Pay, and Google Pay directly on your invoices. Funds land in your Stripe balance instantly.
          <br />
       
        </p>
        <div className="rounded-xl border border-purple-200 bg-white/80 p-3 text-[0.7rem] text-purple-700">
          <p className="font-semibold">Key Info:</p>
          <ul className="mt-1 space-y-1 list-disc pl-4">
            <li>Standard Stripe rate: 2.9% + 30¢ per transaction</li>
            <li>Payouts: 2 business days to your bank (instant +1% anytime)</li>
            <li>Stripe handles all tax forms &amp; compliance automatically</li>
            <li>No SSN or approval delay needed to start</li>
            <li>Your $19/mo stays 100% yours — Stripe only takes the card fee</li>
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
      </div>
    </section>
  );
}
