export type TaxType = 'GST' | 'VAT' | 'SALES_TAX' | 'NONE';

export interface CountryTaxConfig {
  type: TaxType;
  rate: number;
  label: string;
}

/** Default GST/VAT rates by partner property country (on platform commission). */
export const COUNTRY_TAX_RATES: Record<string, CountryTaxConfig> = {
  India: { type: 'GST', rate: 0.18, label: 'GST (18%)' },
  Thailand: { type: 'VAT', rate: 0.07, label: 'VAT (7%)' },
  'United Kingdom': { type: 'VAT', rate: 0.2, label: 'VAT (20%)' },
  UK: { type: 'VAT', rate: 0.2, label: 'VAT (20%)' },
  France: { type: 'VAT', rate: 0.2, label: 'VAT (20%)' },
  Germany: { type: 'VAT', rate: 0.19, label: 'VAT (19%)' },
  Italy: { type: 'VAT', rate: 0.22, label: 'VAT (22%)' },
  Spain: { type: 'VAT', rate: 0.21, label: 'VAT (21%)' },
  Netherlands: { type: 'VAT', rate: 0.21, label: 'VAT (21%)' },
  Australia: { type: 'GST', rate: 0.1, label: 'GST (10%)' },
  'New Zealand': { type: 'GST', rate: 0.15, label: 'GST (15%)' },
  Singapore: { type: 'GST', rate: 0.09, label: 'GST (9%)' },
  Malaysia: { type: 'GST', rate: 0.08, label: 'SST (8%)' },
  'United Arab Emirates': { type: 'VAT', rate: 0.05, label: 'VAT (5%)' },
  UAE: { type: 'VAT', rate: 0.05, label: 'VAT (5%)' },
  'Saudi Arabia': { type: 'VAT', rate: 0.15, label: 'VAT (15%)' },
  Japan: { type: 'VAT', rate: 0.1, label: 'Consumption Tax (10%)' },
  'South Korea': { type: 'VAT', rate: 0.1, label: 'VAT (10%)' },
  Canada: { type: 'GST', rate: 0.05, label: 'GST (5%)' },
  Indonesia: { type: 'VAT', rate: 0.11, label: 'VAT (11%)' },
  Vietnam: { type: 'VAT', rate: 0.1, label: 'VAT (10%)' },
  Philippines: { type: 'VAT', rate: 0.12, label: 'VAT (12%)' },
  Switzerland: { type: 'VAT', rate: 0.081, label: 'VAT (8.1%)' },
  Sweden: { type: 'VAT', rate: 0.25, label: 'VAT (25%)' },
  Norway: { type: 'VAT', rate: 0.25, label: 'VAT (25%)' },
  Denmark: { type: 'VAT', rate: 0.25, label: 'VAT (25%)' },
  Ireland: { type: 'VAT', rate: 0.23, label: 'VAT (23%)' },
  Portugal: { type: 'VAT', rate: 0.23, label: 'VAT (23%)' },
  Belgium: { type: 'VAT', rate: 0.21, label: 'VAT (21%)' },
  Austria: { type: 'VAT', rate: 0.2, label: 'VAT (20%)' },
  Poland: { type: 'VAT', rate: 0.23, label: 'VAT (23%)' },
  USA: { type: 'NONE', rate: 0, label: 'Sales tax (varies by state)' },
  'United States': { type: 'NONE', rate: 0, label: 'Sales tax (varies by state)' },
};

const DEFAULT_TAX: CountryTaxConfig = { type: 'NONE', rate: 0, label: 'No applicable tax' };

export function resolveCountryTax(country: string): CountryTaxConfig {
  if (!country) return DEFAULT_TAX;
  const direct = COUNTRY_TAX_RATES[country];
  if (direct) return direct;
  const normalized = country.trim();
  const match = Object.entries(COUNTRY_TAX_RATES).find(
    ([k]) => k.toLowerCase() === normalized.toLowerCase()
  );
  return match ? match[1] : DEFAULT_TAX;
}

export function calculateTaxOnCommission(commission: number, config: CountryTaxConfig): number {
  if (!config.rate || config.type === 'NONE') return 0;
  return Math.round(commission * config.rate * 100) / 100;
}
