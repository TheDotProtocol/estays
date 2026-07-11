import Link from 'next/link';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Careers — E Stays Hotels' };

export default function CareersPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="font-display text-3xl font-bold text-navy mb-4">Careers at E Stays</h1>
      <p className="text-navy/60 mb-8">
        Join us in redefining hospitality. We&apos;re building the future of hotel booking and property management.
      </p>
      <p className="text-navy/70 text-sm mb-8">
        Open positions will be posted here. For enquiries, email{' '}
        <a href={`mailto:${COMPANY.emails.general}`} className="text-coral hover:underline">{COMPANY.emails.general}</a>
      </p>
      <Link href="/about" className="text-coral hover:underline text-sm">Learn about E Stays →</Link>
    </div>
  );
}
