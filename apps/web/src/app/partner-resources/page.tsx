import Link from 'next/link';
import { LegalList } from '@/components/LegalPage';

export const metadata = { title: 'Partner Resources — E Stays Hotels' };

export default function PartnerResourcesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy mb-4">Partner Resources</h1>
      <p className="text-navy/60 mb-8">Guides and best practices for hotel partners.</p>

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-gold/10 p-6">
          <h2 className="font-semibold text-navy mb-3">Getting Started</h2>
          <LegalList items={[
            'Register your property via the Partner Portal (+ Add Hotel)',
            'Upload high-quality photos of your property',
            'Set up room types, inventory, and pricing',
            'Wait for admin approval (typically within 24 hours)',
            'Go live and start receiving bookings',
          ]} />
        </section>

        <section className="bg-white rounded-xl border border-gold/10 p-6">
          <h2 className="font-semibold text-navy mb-3">Best Practices</h2>
          <LegalList items={[
            'Keep inventory updated daily to avoid overbookings',
            'Use weekend premium pricing for higher revenue',
            'Respond to guest enquiries within 2 hours',
            'Maintain accurate property descriptions and amenities',
            'Upload at least 5 professional-quality photographs',
          ]} />
        </section>

        <Link href="/partner" className="inline-block px-6 py-3 bg-navy text-white rounded-lg hover:bg-navy-light transition">
          Go to Partner Portal →
        </Link>
      </div>
    </div>
  );
}
