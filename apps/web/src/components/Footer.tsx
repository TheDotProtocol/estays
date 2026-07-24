import Link from 'next/link';
import { COMPANY, SOCIAL_LINKS } from '@/lib/company';
import { CurrencySelector } from '@/components/CurrencySelector';

const footerSections = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Hosting',
    links: [
      { label: 'List your property', href: '/partner' },
      { label: 'Partner portal', href: '/partner' },
      { label: 'Partner support', href: '/partner-support' },
      { label: 'Resources', href: '/partner-resources' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Refund policy', href: '/refund-policy' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help centre', href: '/help' },
      { label: 'FAQs', href: '/faqs' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-surface-muted border-t border-surface-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-ink text-sm mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-ink-muted hover:text-ink hover:underline transition">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-surface-border mt-10 pt-8 flex flex-wrap gap-4">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-muted hover:text-ink transition"
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="border-t border-surface-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-sm text-ink-muted">
            <span>© 2026 {COMPANY.name}</span>
            <span className="hidden sm:inline">·</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
          </div>
          <div className="flex items-center gap-4 text-sm text-ink-muted">
            <CurrencySelector />
            <span>English (IN)</span>
          </div>
        </div>
        <p className="text-center text-xs text-ink-subtle mt-4">
          {COMPANY.name} · {COMPANY.tagline}
        </p>
      </div>
    </footer>
  );
}
