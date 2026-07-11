import Link from 'next/link';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Partner Support — E Stays Hotels' };

export default function PartnerSupportPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy mb-4">Partner Support</h1>
      <p className="text-navy/60 mb-8">Dedicated support for hotel partners on the E Stays platform.</p>
      <div className="space-y-4">
        {[
          { title: 'Partner Portal', desc: 'Manage your property, pricing, and bookings.', href: '/partner' },
          { title: 'Partner Terms', desc: 'Review your obligations and commission structure.', href: '/partner-terms' },
          { title: 'Partner Resources', desc: 'Guides, best practices, and onboarding materials.', href: '/partner-resources' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="block bg-white rounded-xl border border-gold/10 p-5 hover:border-coral/30 transition">
            <h2 className="font-semibold text-navy">{item.title}</h2>
            <p className="text-sm text-navy/50 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-navy/50 mt-8">
        Email: <a href={`mailto:${COMPANY.emails.partner}`} className="text-coral hover:underline">{COMPANY.emails.partner}</a>
      </p>
    </div>
  );
}
