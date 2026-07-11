'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';

const NAV = [
  { tab: 'overview', label: 'Overview', icon: '📊' },
  { tab: 'users', label: 'Users', icon: '👥' },
  { tab: 'partners', label: 'Partners', icon: '🤝' },
  { tab: 'transactions', label: 'Transactions', icon: '💳' },
  { tab: 'performance', label: 'Performance', icon: '📈' },
  { tab: 'profit-loss', label: 'P&L', icon: '💰' },
  { tab: 'complaints', label: 'Complaints', icon: '⚠️' },
  { tab: 'feedback', label: 'Feedback', icon: '⭐' },
  { tab: 'approvals', label: 'Approvals', icon: '✅' },
  { tab: 'billing', label: 'Billing', icon: '💰' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy text-white border-b border-coral/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-4 min-w-0">
            <BrandLogo href="/admin" size={36} variant="light" subtitle="Admin Portal" />
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
              {NAV.map((item) => (
                <Link
                  key={item.tab}
                  href={`/admin?tab=${item.tab}`}
                  className={`px-2.5 py-1.5 text-xs whitespace-nowrap rounded-lg transition shrink-0 ${
                    pathname === '/admin' && activeTab === item.tab
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/" className="text-sm text-gold hover:underline shrink-0 ml-2">← Site</Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
