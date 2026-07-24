'use client';

import { convertFromUSD } from '@estays/shared';

/** Agoda-style INR price presentation */
export function formatAgodaInr(amountUsd: number) {
  const perNight = convertFromUSD(amountUsd, 'INR');
  const was = Math.round(perNight * 1.12);
  return {
    perNight,
    formatted: `₹${perNight.toLocaleString('en-IN')}`,
    wasFormatted: was > perNight ? `₹${was.toLocaleString('en-IN')}` : null,
  };
}

export function formatAgodaInrTotal(amountUsd: number, nights: number) {
  const total = convertFromUSD(amountUsd * nights, 'INR');
  return `₹${total.toLocaleString('en-IN')}`;
}
