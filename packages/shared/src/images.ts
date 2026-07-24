/** Block Agoda UI assets, flags, logos, and placeholder images from hotel galleries. */
const BLOCKED_PHOTO_URL_PATTERNS = [
  /agoda-logo/i,
  /cdn-design-system/i,
  /\/images\/mobile\//i,
  /\/images\/default\//i,
  /\/generic\//i,
  /\/flag-/i,
  /\.svg(\?|$)/i,
];

export function isValidHotelPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.replace(/;$/, '').trim();
  const lower = clean.toLowerCase();
  if (!/\.(jpe?g|png|webp)(\?|$)/i.test(lower)) return false;
  return !BLOCKED_PHOTO_URL_PATTERNS.some((pattern) => pattern.test(lower));
}

/** Guest photos must be real uploads — exclude all Agoda generic/brand assets. */
export function isValidGuestPhotoUrl(url: string | null | undefined): boolean {
  return isValidHotelPhotoUrl(url);
}

export function filterValidPhotoUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(isValidHotelPhotoUrl))];
}
