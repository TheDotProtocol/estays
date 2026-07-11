import type { Metadata } from 'next';
import './globals.css';
import { CurrencyProvider } from '@/lib/currency';
import { SiteChrome } from '@/components/SiteChrome';

export const metadata: Metadata = {
  title: 'E Stays Hotels — Stay. Live. Belong',
  description: 'Discover and book exceptional hotels worldwide with E Stays.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <CurrencyProvider>
          <SiteChrome>{children}</SiteChrome>
        </CurrencyProvider>
      </body>
    </html>
  );
}
