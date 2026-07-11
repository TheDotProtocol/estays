import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'About Us — E Stays Hotels' };

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <BrandLogo href="/" size={100} showText={false} className="justify-center mb-6" />
        <h1 className="font-display text-4xl font-bold text-navy">About E Stays</h1>
        <p className="text-gold text-lg mt-2">{COMPANY.tagline}</p>
      </div>

      <div className="prose-custom space-y-6 text-navy/70 leading-relaxed">
        <p>
          {COMPANY.name} is a modern hospitality platform connecting travellers with exceptional hotels worldwide.
          We believe every journey deserves a place where you can stay, live, and truly belong.
        </p>
        <p>
          Founded as part of {COMPANY.parent} and backed by {COMPANY.ultimateParent}, E Stays combines
          cutting-edge technology with the warmth of genuine hospitality. Our platform empowers hotel partners
          to reach global audiences while giving guests transparent pricing, real-time availability, and
          seamless booking experiences.
        </p>
        <p>
          From boutique city hotels to luxury resorts, we curate properties that meet our standards for quality,
          safety, and service — so you can book with confidence.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-12 text-center">
        {[
          { value: '50+', label: 'Partner Hotels' },
          { value: '10K+', label: 'Happy Guests' },
          { value: '15+', label: 'Countries' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gold/10 p-6">
            <div className="text-2xl font-bold text-navy">{s.value}</div>
            <div className="text-xs text-navy/50 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <Link href="/partner" className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-light transition inline-block">
          List Your Property
        </Link>
      </div>
    </div>
  );
}
