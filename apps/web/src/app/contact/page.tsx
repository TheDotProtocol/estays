import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Contact Us — E Stays Hotels' };

export default function ContactPage() {
  const contacts = [
    { title: 'General Enquiries', email: COMPANY.emails.general, desc: 'For general questions about E Stays.' },
    { title: 'Customer Support', email: COMPANY.emails.support, desc: 'Booking help, cancellations, and account issues.' },
    { title: 'Hotel Partnerships', email: COMPANY.emails.partner, desc: 'List your property or partner enquiries.' },
    { title: 'Billing & Finance', email: COMPANY.emails.billing, desc: 'Invoices, payouts, and payment disputes.' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy mb-2">Contact Us</h1>
      <p className="text-navy/60 mb-10">We&apos;re here to help. Reach the right team below.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {contacts.map((c) => (
          <div key={c.title} className="bg-white rounded-xl border border-gold/10 p-6 shadow-sm">
            <h2 className="font-semibold text-navy mb-1">{c.title}</h2>
            <p className="text-sm text-navy/50 mb-3">{c.desc}</p>
            <a href={`mailto:${c.email}`} className="text-coral hover:underline text-sm font-medium">{c.email}</a>
          </div>
        ))}
      </div>

      <div className="bg-navy text-white rounded-2xl p-8">
        <h2 className="font-display text-xl font-bold mb-4">Head Office</h2>
        <address className="not-italic text-white/80 text-sm leading-relaxed mb-4">
          {COMPANY.name}<br />
          {COMPANY.address.line1}<br />
          {COMPANY.address.city}, {COMPANY.address.state} {COMPANY.address.zip}<br />
          {COMPANY.address.country}
        </address>
        <p className="text-gold text-sm">Phone: {COMPANY.phone}</p>
        <p className="text-white/50 text-xs mt-4">
          Part of {COMPANY.parent} · {COMPANY.ultimateParent}
        </p>
      </div>
    </div>
  );
}
