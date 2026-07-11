import Link from 'next/link';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Help Center — E Stays Hotels' };

const topics = [
  { title: 'Booking & Reservations', links: ['How to book a hotel', 'Modify your booking', 'Cancellation policy', 'Payment methods'] },
  { title: 'Your Account', links: ['Create an account', 'Reset password', 'Update profile', 'Delete your account'] },
  { title: 'During Your Stay', links: ['Check-in process', 'Check-out process', 'Special requests', 'Report an issue'] },
  { title: 'For Partners', links: ['List your property', 'Manage inventory', 'Update pricing', 'Upload photos'] },
];

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy mb-2">Help Center</h1>
      <p className="text-navy/60 mb-10">Find answers to common questions or contact our support team.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {topics.map((t) => (
          <div key={t.title} className="bg-white rounded-xl border border-gold/10 p-6">
            <h2 className="font-semibold text-navy mb-3">{t.title}</h2>
            <ul className="space-y-2">
              {t.links.map((l) => (
                <li key={l}>
                  <Link href="/faqs" className="text-sm text-navy/60 hover:text-coral transition">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-sand rounded-xl p-6 text-center">
        <p className="text-navy mb-2">Can&apos;t find what you need?</p>
        <a href={`mailto:${COMPANY.emails.support}`} className="text-coral hover:underline font-medium">
          Contact Support — {COMPANY.emails.support}
        </a>
        <p className="text-sm text-navy/40 mt-2">Phone: {COMPANY.phone}</p>
      </div>
    </div>
  );
}
