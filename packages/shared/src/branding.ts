/** Strip an existing E Stays prefix so partners only enter their property name. */
export function stripPropertyNamePrefix(name: string): string {
  return name.replace(/^E\s*Stays\s+/i, '').trim();
}

/** Apply the uniform E Stays brand prefix to a property name. */
export function brandPropertyName(name: string): string {
  const base = stripPropertyNamePrefix(name);
  if (!base) return '';
  return `E Stays ${base.replace(/^The /i, '')}`;
}

/** AR Hospitality direct-managed properties — show badge on listing photos */
export const AR_HOSPITALITY_PROPERTY_SLUGS = [
  'sandcastle-mara-lodge',
  'grand-sunset-phuket',
  'keraton-jimbaran',
  'tri-shawa-resort',
  'berjaya-langkawi-resort',
] as const;

export type ArHospitalitySlug = (typeof AR_HOSPITALITY_PROPERTY_SLUGS)[number];

export function isArHospitalityProperty(slug: string): boolean {
  return (AR_HOSPITALITY_PROPERTY_SLUGS as readonly string[]).includes(slug);
}
