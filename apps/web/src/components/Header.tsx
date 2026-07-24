'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useEffect, useState } from 'react';
import { getStoredUser, clearTokens, ensureAuthSession } from '@/lib/api';
import { CurrencySelector } from '@/components/CurrencySelector';
import { LoyaltyBadge } from '@/components/LoyaltyBadge';

interface StoredUser {
  firstName: string;
  lastName: string;
  roles: string[];
}

export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    ensureAuthSession().then((ok) => {
      setUser(ok ? getStoredUser() : null);
    });
  }, [pathname]);

  const handleLogout = () => {
    clearTokens();
    setUser(null);
    window.location.href = '/';
  };

  const isAdmin = user?.roles?.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
  const isPartner = user?.roles?.some((r) => ['PARTNER', 'RECEPTIONIST'].includes(r));
  const isGuest = user && !isPartner && !isAdmin;

  const navLink = (href: string, match: boolean) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition ${
      match ? 'text-ink underline underline-offset-4 decoration-2' : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
    }`;

  return (
    <header className="bg-white border-b border-surface-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <BrandLogo href="/" size={44} />

          <nav className="flex items-center gap-1 sm:gap-2">
            <CurrencySelector />
            <Link href="/" className={navLink('/', pathname === '/')}>
              Stays
            </Link>
            {isGuest && (
              <>
                <Link href="/bookings" className={navLink('/bookings', pathname.startsWith('/bookings'))}>
                  Trips
                </Link>
                <Link href="/rewards" className={navLink('/rewards', pathname.startsWith('/rewards'))}>
                  Rewards
                </Link>
              </>
            )}
            {user ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-surface-border">
                {isGuest && <LoyaltyBadge compact />}
                <Link href="/notifications" className="px-2 py-2 text-sm text-ink-muted hover:text-ink rounded-lg">
                  Inbox
                </Link>
                <span className="text-sm text-ink-muted hidden md:inline max-w-[120px] truncate">
                  {user.firstName}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm text-ink-muted hover:text-ink rounded-lg transition"
                >
                  Log out
                </button>
              </div>
            ) : (
              <>
                <Link href="/partner" className="hidden sm:inline px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink">
                  List your property
                </Link>
                <Link href="/signup" className="px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink">
                  Sign up
                </Link>
                <Link href="/login" className="ml-1 px-4 py-2 text-sm font-semibold btn-primary">
                  Log in
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
