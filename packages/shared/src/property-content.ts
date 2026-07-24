/** Structured property guide content (Agoda-style About, Facilities, Policies). */
export interface PropertyAboutSection {
  title: string;
  body: string;
}

export interface PropertyFacilityGroup {
  category: string;
  items: string[];
}

export interface PropertyLocationHighlight {
  name: string;
  distance: string;
}

export interface PropertyPolicyGroup {
  title: string;
  items: string[];
}

export interface PropertyUsefulFact {
  label: string;
  value: string;
}

export interface HotelRichContent {
  tagline: string;
  aboutSections: PropertyAboutSection[];
  facilities: PropertyFacilityGroup[];
  locationHighlights: PropertyLocationHighlight[];
  policies: PropertyPolicyGroup[];
  usefulFacts: PropertyUsefulFact[];
  /** Flat amenity list synced to HotelAmenity on import */
  amenityNames?: string[];
  /** Guest-submitted photos (also imported as hotel images) */
  guestPhotoUrls?: string[];
}

/** Ensure marketing copy references the E Stays-branded property name. */
export function brandPropertyDescription(text: string, brandedPropertyName: string): string {
  const base = brandedPropertyName.replace(/^E\s*Stays\s+/i, '').trim();
  let result = text.trim();
  if (!result) return `Book ${brandedPropertyName} with E Stays.`;

  const variants = [
    base,
    base.replace(/-/g, ' '),
    base.replace(/\s+/g, '-'),
    `Tri - Shawa Resort`,
    `Tri-Shawa Resort`,
    `Keraton Jimbaran Resort`,
    `Keraton Jimbaran`,
    `Grand Sunset Hotel`,
    `Grand Sunset Phuket`,
    `Berjaya Langkawi Resort`,
    `Hotel White Sandcastle Masai Mara Budget Lodge`,
    `Sandcastle Mara Lodge`,
  ];

  for (const variant of variants) {
    if (variant.length < 4) continue;
    const re = new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(re, brandedPropertyName);
  }

  if (!/E\s*Stays/i.test(result.slice(0, 120))) {
    result = `Book ${brandedPropertyName} with E Stays. ${result}`;
  }

  return result.replace(/\s+/g, ' ').trim();
}
