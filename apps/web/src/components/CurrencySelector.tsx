'use client';

import { useCurrency } from '@/lib/currency';

export function CurrencySelector({ className = '' }: { className?: string }) {
  const { currency, setCurrency, currencies } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className={`text-sm bg-transparent border border-surface-border rounded-lg px-2 py-1 text-ink cursor-pointer hover:border-ink transition ${className}`}
      aria-label="Select currency"
    >
      {currencies.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.code}
        </option>
      ))}
    </select>
  );
}
