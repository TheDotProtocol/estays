'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname.startsWith('/partner') || pathname.startsWith('/admin');

  return (
    <>
      {!isPortal && <Header />}
      <main className="flex-1">{children}</main>
      {!isPortal && <Footer />}
    </>
  );
}
