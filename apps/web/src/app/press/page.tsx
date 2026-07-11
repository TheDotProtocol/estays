import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Press — E Stays Hotels' };

export default function PressPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-navy mb-4">Press & Media</h1>
      <p className="text-navy/60 mb-8">Media enquiries and press resources for {COMPANY.name}.</p>
      <div className="bg-white rounded-xl border border-gold/10 p-6 space-y-4 text-sm text-navy/70">
        <p><strong className="text-navy">Press Contact:</strong> <a href={`mailto:${COMPANY.emails.general}`} className="text-coral hover:underline">{COMPANY.emails.general}</a></p>
        <p><strong className="text-navy">Company:</strong> {COMPANY.name}</p>
        <p><strong className="text-navy">Parent:</strong> {COMPANY.parent}</p>
        <p><strong className="text-navy">Headquarters:</strong> {COMPANY.address.city}, {COMPANY.address.state}</p>
      </div>
    </div>
  );
}
