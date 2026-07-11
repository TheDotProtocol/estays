'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';

const NAV = [
  { href: '/partner', label: 'Properties', icon: '🏨', match: (p: string) => p === '/partner' },
  { href: '/partner/bookings', label: 'Bookings', icon: '📋', match: (p: string) => p.startsWith('/partner/bookings') },
  { href: '/partner/finance', label: 'Finance', icon: '💰', match: (p: string) => p.startsWith('/partner/finance') },
];

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy text-white border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <BrandLogo href="/partner" size={36} variant="light" subtitle="Partner Portal" />
            <nav className="hidden sm:flex gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    item.match(pathname) ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/" className="text-sm text-gold hover:underline">← Back to E Stays</Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
