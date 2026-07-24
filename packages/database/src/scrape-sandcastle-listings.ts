/**
 * Pull room types, photos, and rates from sandcastlemaralodge.com (Shopify).
 * Updates sandcastle-mara-lodge in ar-agoda-import.json.
 *
 * Run: npm run scrape:sandcastle --workspace=@estays/database
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const COLLECTION_URL =
  'https://sandcastlemaralodge.com/collections/budget-accommodation-in-masai-mara/products.json?limit=50';
const INR_PER_USD = 83.5;

type ShopifyProduct = {
  title: string;
  body_html: string;
  product_type: string;
  tags: string[];
  variants: { price: string }[];
  images: { src: string }[];
};

function stripHtml(html: string): string {
  return html
   .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 480);
}

function inferNights(title: string, tags: string[]): number {
  const lower = title.toLowerCase();
  const m = lower.match(/(\d+)\s*[- ]?\s*night/);
  if (m) return parseInt(m[1], 10);
  if (tags.includes('3-days-2-nights')) return 2;
  if (lower.includes('3-night')) return 3;
  if (lower.includes('2-night') || lower.includes('2 nights')) return 2;
  return 1;
}

function inferOccupancy(title: string, productType: string): number {
  const text = `${title} ${productType}`.toLowerCase();
  if (text.includes('single') || text.includes('1 person')) return 1;
  if (text.includes('triple') || text.includes('3 people')) return 3;
  if (text.includes('family') || text.includes('4 or 5')) return 4;
  return 2;
}

function inferBedType(title: string, productType: string, occupancy: number): string {
  const text = `${title} ${productType}`.toLowerCase();
  if (text.includes('single')) return 'Single bed';
  if (text.includes('triple')) return '3 beds';
  if (text.includes('family')) return 'Multiple beds';
  if (text.includes('double')) return 'Double bed';
  if (text.includes('camping')) return 'Camping tent';
  return occupancy === 1 ? 'Single bed' : 'Double bed';
}

function buildFeatures(product: ShopifyProduct, occupancy: number): string[] {
  const features = new Set<string>();
  if (product.product_type) features.add(product.product_type.replace(/\([^)]*\)/g, '').trim());
  for (const tag of product.tags.slice(0, 4)) {
    features.add(tag.replace(/-/g, ' '));
  }
  features.add(`${occupancy} guest${occupancy > 1 ? 's' : ''}`);
  features.add('Breakfast available');
  features.add('Free WiFi');
  features.add('Masai Mara location');
  return [...features].slice(0, 10);
}

function shortRoomName(title: string): string {
  return title
    .replace(/, Sekenani$/i, '')
    .replace(/\s+for \d+$/i, '')
    .replace(/\s+in Masai Mara$/i, '')
    .replace(/\s+Masai Mara$/i, '')
    .trim();
}

async function main() {
  const res = await fetch(COLLECTION_URL);
  if (!res.ok) throw new Error(`Shopify fetch failed: ${res.status}`);
  const data = (await res.json()) as { products: ShopifyProduct[] };

  const rooms = data.products.map((product) => {
    const priceUsd = parseFloat(product.variants[0]?.price || '0');
    const nights = inferNights(product.title, product.tags);
    const maxOccupancy = inferOccupancy(product.title, product.product_type);
    const nightlyUsd = Math.round((priceUsd / Math.max(nights, 1)) * 100) / 100;
    const imageUrls = product.images.map((img) => img.src);
    const name = shortRoomName(product.title);

    return {
      name,
      description: `${stripHtml(product.body_html)} Book with E Stays.`,
      maxOccupancy,
      bedType: inferBedType(product.title, product.product_type, maxOccupancy),
      priceInr: Math.round(nightlyUsd * INR_PER_USD),
      basePriceUsd: nightlyUsd,
      imageUrl: imageUrls[0] || null,
      imageUrls,
      features: buildFeatures(product, maxOccupancy),
    };
  });

  const hotelImages: { url: string; caption: string }[] = [];
  const seen = new Set<string>();
  for (const room of rooms) {
    for (const url of room.imageUrls) {
      if (!seen.has(url)) {
        seen.add(url);
        hotelImages.push({ url, caption: room.name });
      }
    }
  }

  const filePath = join(__dirname, 'data', 'ar-agoda-import.json');
  const all = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;

  all['sandcastle-mara-lodge'] = {
    propertyName: 'Hotel White Sandcastle Masai Mara Budget Lodge',
    description:
      'Affordable accommodation at White Sandcastle Masai Mara Lodge. Enjoy tranquil nature, wildlife views and guided safaris on the edge of the Maasai Mara. Book with E Stays.',
    images: hotelImages,
    rooms,
    imageCount: hotelImages.length,
    roomCount: rooms.length,
    sourceUrl: 'https://sandcastlemaralodge.com/collections/budget-accommodation-in-masai-mara',
  };

  writeFileSync(filePath, `${JSON.stringify(all, null, 2)}\n`);
  console.log(`Updated sandcastle-mara-lodge: ${rooms.length} room types, ${hotelImages.length} photos`);
  for (const r of rooms) {
    console.log(`  ✓ ${r.name}: ${r.imageUrls.length} photos · $${r.basePriceUsd}/night`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
