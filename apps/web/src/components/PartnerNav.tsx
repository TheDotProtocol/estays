'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/partner', label: 'Dashboard' },
  { href: '/partner/pms', label: 'E PMS' },
  { href: '/partner/bookings', label: 'Bookings' },
  { href: '/partner/analytics', label: 'Analytics' },
  { href: '/partner/finance', label: 'Finance' },
  { href: '/partner/hr', label: 'HR & Payroll' },
];

export function PartnerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            pathname === link.href || (link.href !== '/partner' && pathname.startsWith(link.href))
              ? 'bg-navy text-white'
              : 'bg-sand text-navy hover:bg-gold/20'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
