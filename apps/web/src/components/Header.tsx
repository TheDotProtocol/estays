'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useEffect, useState } from 'react';
import { getStoredUser, clearTokens } from '@/lib/api';
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
    setUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    clearTokens();
    setUser(null);
    window.location.href = '/';
  };

  const isAdmin = user?.roles?.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
  const isPartner = user?.roles?.some((r) => ['PARTNER', 'RECEPTIONIST'].includes(r));
  const isGuest = user && !isPartner && !isAdmin;

  return (
    <header className="bg-white border-b border-gold/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <BrandLogo href="/" size={48} />

          <nav className="flex items-center gap-1 sm:gap-3">
            <CurrencySelector />
            <Link
              href="/"
              className={`px-3 py-2 text-sm rounded-lg transition ${pathname === '/' ? 'bg-navy text-white' : 'text-navy hover:bg-sand'}`}
            >
              Search
            </Link>
            {isGuest && (
              <>
                <Link
                  href="/bookings"
                  className={`px-3 py-2 text-sm rounded-lg transition ${pathname.startsWith('/bookings') ? 'bg-navy text-white' : 'text-navy hover:bg-sand'}`}
                >
                  My Bookings
                </Link>
                <Link
                  href="/rewards"
                  className={`px-3 py-2 text-sm rounded-lg transition ${pathname.startsWith('/rewards') ? 'bg-navy text-white' : 'text-navy hover:bg-sand'}`}
                >
                  Rewards
                </Link>
              </>
            )}
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                {isGuest && <LoyaltyBadge compact />}
                <Link href="/notifications" className="px-2 py-2 text-sm text-navy/70 hover:bg-sand rounded-lg">Alerts</Link>
                <span className="text-sm text-navy/70 hidden md:inline">
                  {user.firstName} {user.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm text-coral hover:bg-coral/10 rounded-lg transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/signup" className="px-3 py-2 text-sm text-navy hover:bg-sand rounded-lg transition">
                  Join Free
                </Link>
                <Link
                  href="/login"
                  className="ml-1 px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy-light transition"
                >
                  Sign In
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
