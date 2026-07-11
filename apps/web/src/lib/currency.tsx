'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CURRENCIES, convertFromUSD, formatPrice, CurrencyInfo } from '@estays/shared';

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  currencies: CurrencyInfo[];
  format: (amountUsd: number) => string;
  convert: (amountUsd: number) => number;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'INR',
  setCurrency: () => {},
  currencies: Object.values(CURRENCIES),
  format: (n) => `$${n}`,
  convert: (n) => n,
  symbol: '₹',
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState('INR');

  useEffect(() => {
    const saved = localStorage.getItem('currency');
    if (saved && CURRENCIES[saved]) setCurrencyState(saved);
  }, []);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    localStorage.setItem('currency', code);
  };

  const info = CURRENCIES[currency] || CURRENCIES.INR;

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        currencies: Object.values(CURRENCIES),
        format: (amountUsd: number) => formatPrice(amountUsd, currency),
        convert: (amountUsd: number) => convertFromUSD(amountUsd, currency),
        symbol: info.symbol,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
