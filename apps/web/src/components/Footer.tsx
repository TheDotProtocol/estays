import Link from 'next/link';
import { COMPANY, SOCIAL_LINKS } from '@/lib/company';
import { CurrencySelector } from '@/components/CurrencySelector';

const footerSections = [
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { label: 'List Your Property', href: '/partner' },
      { label: 'Partner Portal', href: '/partner' },
      { label: 'Partner Support', href: '/partner-support' },
      { label: 'Partner Resources', href: '/partner-resources' },
      { label: 'Partner Terms', href: '/partner-terms' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Refund Policy', href: '/refund-policy' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Accessibility', href: '/accessibility' },
      { label: 'GDPR Notice', href: '/gdpr' },
      { label: 'Acceptable Use', href: '/acceptable-use' },
      { label: 'Copyright', href: '/copyright' },
      { label: 'Trademark', href: '/trademark' },
      { label: 'Community Guidelines', href: '/community-guidelines' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'FAQs', href: '/faqs' },
      { label: 'Contact Support', href: '/contact' },
      { label: 'Refund & Cancellation', href: '/refund-policy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-sand border-t border-gold/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-navy text-sm mb-4">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-navy/60 hover:text-navy hover:underline transition">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social */}
        <div className="border-t border-gold/10 mt-10 pt-8">
          <h3 className="font-semibold text-navy text-sm mb-4">Social</h3>
          <div className="flex flex-wrap gap-4">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-navy/60 hover:text-coral transition"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gold/10 mt-8 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-sm text-navy/60">
              <span>© 2026 {COMPANY.name}.</span>
              <span className="hidden sm:inline">·</span>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <span>·</span>
              <Link href="/terms" className="hover:underline">Terms</Link>
              <span>·</span>
              <Link href="/company" className="hover:underline">Company details</Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-navy/60">
              <CurrencySelector />
              <span>🌐 English (IN)</span>
            </div>
          </div>
          <p className="text-center text-xs text-navy/50 mt-4">
            {COMPANY.name} is part of {COMPANY.parent}, a member of {COMPANY.ultimateParent}.
          </p>
          <p className="text-center text-xs text-gold mt-2">
            {COMPANY.tagline} · All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
