/** E Stays corporate identity — used in PDFs, footers, and legal pages. */
export const ESTAYS_COMPANY = {
  name: 'E Stays Hotels LLC',
  parent: 'AR Hospitality Company Ltd',
  ultimateParent: 'AR Holdings Group Corporation',
  tagline: 'Stay. Live. Belong',
  address: {
    line1: '1075 Terra Bella Ave',
    city: 'Mountain View',
    state: 'California',
    zip: '94043',
    country: 'United States',
  },
  emails: {
    general: 'info@estayshotels.com',
    support: 'support@estayshotels.com',
    partner: 'partner@estayshotels.com',
    billing: 'billing@estayshotels.com',
    bookings: 'bookings@estayshotels.com',
  },
  phone: '1-800-ESTAYS',
  website: 'https://estayshotels.com',
  governingLaw: 'State of California, United States',
} as const;

export function formatCompanyAddress(): string {
  const a = ESTAYS_COMPANY.address;
  return `${a.line1}, ${a.city}, ${a.state} ${a.zip}, ${a.country}`;
}

export function formatCompanyFooter(): string[] {
  return [
    ESTAYS_COMPANY.name,
    formatCompanyAddress(),
    `${ESTAYS_COMPANY.emails.general} · ${ESTAYS_COMPANY.emails.billing}`,
    `${ESTAYS_COMPANY.name} is part of ${ESTAYS_COMPANY.parent}, a member of ${ESTAYS_COMPANY.ultimateParent}.`,
    `${ESTAYS_COMPANY.tagline} · © ${new Date().getFullYear()} All rights reserved.`,
  ];
}
