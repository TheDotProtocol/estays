import Link from 'next/link';
import { COMPANY } from '@/lib/company';

interface Section {
  title: string;
  content: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  subtitle?: string;
  sections: Section[];
}

export function LegalPage({ title, subtitle, sections }: LegalPageProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy">{title}</h1>
        {subtitle && <p className="text-navy/60 mt-2">{subtitle}</p>}
        <p className="text-sm text-navy/40 mt-4">Last updated: {COMPANY.lastUpdated}</p>
      </div>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-xl font-bold text-navy mb-4">{section.title}</h2>
            <div className="text-navy/70 leading-relaxed space-y-3 text-[15px]">{section.content}</div>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-gold/20 text-sm text-navy/50">
        <p>
          Questions? Contact us at{' '}
          <a href={`mailto:${COMPANY.emails.support}`} className="text-coral hover:underline">
            {COMPANY.emails.support}
          </a>{' '}
          or visit our <Link href="/contact" className="text-coral hover:underline">Contact page</Link>.
        </p>
      </div>
    </div>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
