export const BASE_CURRENCY = 'USD';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rate: number; // units per 1 USD
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rate: 1 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rate: 83.5 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', rate: 35.2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rate: 0.79 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', rate: 3.67 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', rate: 1.34 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', rate: 149.5 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', rate: 1.53 },
};

export const PROPERTY_TYPES = {
  HOTEL: 'Hotel',
  RESORT: 'Resort',
  SERVICE_APARTMENT: 'Service Apartment',
  HOUSE: 'House',
  VILLA: 'Villa',
  BOUTIQUE: 'Boutique Hotel',
  HOMESTAY: 'Homestay',
} as const;

export type PropertyTypeKey = keyof typeof PROPERTY_TYPES;

export function convertFromUSD(amountUsd: number, targetCurrency: string): number {
  const currency = CURRENCIES[targetCurrency] || CURRENCIES.USD;
  const converted = amountUsd * currency.rate;
  if (targetCurrency === 'JPY' || targetCurrency === 'INR' || targetCurrency === 'THB') {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100;
}

export function formatPrice(amountUsd: number, currencyCode: string): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const amount = convertFromUSD(amountUsd, currencyCode);
  return `${currency.symbol}${amount.toLocaleString()}`;
}

export const PAYMENT_REGIONS = {
  INDIA: {
    label: 'India',
    flag: '🇮🇳',
    methods: ['UPI'] as const,
    currency: 'INR',
    upiId: 'estays@icici',
    merchantName: 'E Stays Hotels',
  },
  THAILAND: {
    label: 'Thailand',
    flag: '🇹🇭',
    methods: ['ALIPAY', 'THAI_QR'] as const,
    currency: 'THB',
    alipayId: 'estays@alipay',
    thaiMerchantId: 'ESTAYS001',
  },
} as const;
