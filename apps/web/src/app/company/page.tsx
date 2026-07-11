import Link from 'next/link';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Company Details — E Stays Hotels' };

export default function CompanyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy mb-2">Company Details</h1>
      <p className="text-navy/60 mb-10">Corporate information for {COMPANY.name}</p>

      <div className="bg-white rounded-2xl border border-gold/10 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          <section>
            <h2 className="font-display text-lg font-bold text-navy mb-3">Corporate Structure</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-navy/50 w-48 shrink-0">Company Name</dt>
                <dd className="text-navy font-medium">{COMPANY.name}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-navy/50 w-48 shrink-0">Parent Company</dt>
                <dd className="text-navy">{COMPANY.parent}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-navy/50 w-48 shrink-0">Ultimate Parent</dt>
                <dd className="text-navy">{COMPANY.ultimateParent}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-navy mb-3">Registered Address</h2>
            <address className="text-navy/70 not-italic text-sm leading-relaxed">
              {COMPANY.address.line1}<br />
              {COMPANY.address.city}, {COMPANY.address.state} {COMPANY.address.zip}<br />
              {COMPANY.address.country}
            </address>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-navy mb-3">Contact</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['General Enquiries', COMPANY.emails.general],
                ['Customer Support', COMPANY.emails.support],
                ['Hotel Partnerships', COMPANY.emails.partner],
                ['Billing & Finance', COMPANY.emails.billing],
              ].map(([label, email]) => (
                <div key={label} className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="text-navy/50 w-48 shrink-0">{label}</dt>
                  <dd>
                    <a href={`mailto:${email}`} className="text-coral hover:underline">{email}</a>
                  </dd>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-navy/50 w-48 shrink-0">Customer Support Phone</dt>
                <dd className="text-navy font-medium">{COMPANY.phone}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-navy mb-3">Legal</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                ['Privacy Policy', '/privacy'],
                ['Terms & Conditions', '/terms'],
                ['Cookie Policy', '/cookies'],
                ['Refund Policy', '/refund-policy'],
                ['Partner Terms', '/partner-terms'],
                ['GDPR Notice', '/gdpr'],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="text-coral hover:underline">{label}</Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <p className="text-center text-xs text-navy/40 mt-8">
        © 2026 {COMPANY.name}. All rights reserved.
      </p>
    </div>
  );
}
