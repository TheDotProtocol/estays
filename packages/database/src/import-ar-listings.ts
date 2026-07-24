/**
 * Import AR Hospitality listing content from Agoda scrape JSON.
 * Replaces images, descriptions, room types, and Agoda-matched INR rates.
 *
 * Run: npm run db:import-ar
 * Production: DATABASE_URL="<render-postgres-url>" npm run db:import-ar
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import {
  AR_HOSPITALITY_PROPERTY_SLUGS,
  brandPropertyDescription,
  brandPropertyName,
  filterValidPhotoUrls,
  isValidGuestPhotoUrl,
  isValidHotelPhotoUrl,
  type HotelRichContent,
} from '@estays/shared';
import { createManyInChunks, createSeedPrisma } from './seed-prisma';
import { getArPropertyContent } from './data/ar-property-content';

const prisma = createSeedPrisma();

const INR_PER_USD = 83.5;

const SLUG_BRANDED_NAMES: Record<string, string> = {
  'sandcastle-mara-lodge': 'E Stays Sandcastle Mara Lodge',
  'grand-sunset-phuket': 'E Stays Grand Sunset Phuket',
  'keraton-jimbaran': 'E Stays Keraton Jimbaran',
  'tri-shawa-resort': 'E Stays Tri-Shawa Resort',
  'berjaya-langkawi-resort': 'E Stays Berjaya Langkawi Resort',
};

type ImportedRoom = {
  name: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  priceInr?: number | null;
  basePriceUsd?: number | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  features?: string[];
};

type ImportedListing = {
  propertyName?: string;
  description?: string;
  images?: { url: string; caption?: string }[];
  rooms?: ImportedRoom[];
  richContent?: HotelRichContent;
  checkInTime?: string;
  checkOutTime?: string;
  amenityNames?: string[];
  guestPhotoUrls?: string[];
  error?: string;
};

function loadImportData(): Record<string, ImportedListing> {
  const filePath = join(__dirname, 'data', 'ar-agoda-import.json');
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, ImportedListing>;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function resolveBasePriceUsd(room: ImportedRoom): number {
  if (room.basePriceUsd && room.basePriceUsd > 0) return room.basePriceUsd;
  if (room.priceInr && room.priceInr > 0) return Math.round((room.priceInr / INR_PER_USD) * 100) / 100;
  return 99;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function resolveRoomImageUrl(
  room: ImportedRoom,
  images: { url: string; caption?: string }[]
): string | null {
  if (room.imageUrl) return room.imageUrl.replace(/;$/, '');
  const roomName = normalizeName(room.name);
  const exact = images.find((img) => normalizeName(img.caption || '') === roomName);
  if (exact) return exact.url.replace(/;$/, '');
  const partial = images.find((img) => {
    const cap = normalizeName(img.caption || '');
    if (!cap) return false;
    return roomName.includes(cap) || cap.includes(roomName) || roomName.startsWith(cap.slice(0, 10));
  });
  return partial?.url.replace(/;$/, '') || null;
}

function resolveRoomGalleryUrls(
  room: ImportedRoom,
  images: { url: string; caption?: string }[]
): string[] {
  const fromImport = (room.imageUrls || []).map((u) => u.replace(/;$/, '')).filter(Boolean);
  if (fromImport.length) return [...new Set(fromImport)];

  const roomName = normalizeName(room.name);
  const matched = images
    .filter((img) => {
      const cap = normalizeName(img.caption || '');
      if (!cap) return false;
      return cap === roomName || roomName.includes(cap) || cap.includes(roomName);
    })
    .map((img) => img.url.replace(/;$/, ''));
  const unique = [...new Set(matched)];
  const single = resolveRoomImageUrl(room, images);
  if (single && !unique.includes(single)) unique.unshift(single);
  return unique.slice(0, 12);
}

function parseTimeFromPolicy(text: string, kind: 'in' | 'out'): string | null {
  const patterns =
    kind === 'in'
      ? [/check-in from[:\s]+(\d{1,2}:\d{2}\s*[AP]M)/i, /check-in from[:\s]+(\d{1,2}:\d{2})/i]
      : [/check-out until[:\s]+(\d{1,2}:\d{2}\s*[AP]M)/i, /check-out until[:\s]+(\d{1,2}:\d{2})/i];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeTime(match[1]);
  }
  return null;
}

function normalizeTime(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  const ampm = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const min = ampm[2];
    if (ampm[3] === 'PM' && hour < 12) hour += 12;
    if (ampm[3] === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}`;
  }
  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`;
  return trimmed;
}

function resolveRichContent(slug: string, listing: ImportedListing): HotelRichContent | null {
  const fromFile = getArPropertyContent(slug);
  const merged = listing.richContent || fromFile;
  if (!merged) return null;

  const brandedName = SLUG_BRANDED_NAMES[slug] || brandPropertyName(listing.propertyName || slug);
  return {
    ...merged,
    tagline: brandPropertyDescription(merged.tagline, brandedName),
    aboutSections: merged.aboutSections.map((s) => ({
      title: brandPropertyDescription(s.title, brandedName),
      body: brandPropertyDescription(s.body, brandedName),
    })),
  };
}

function resolveCheckTimes(
  listing: ImportedListing,
  richContent: HotelRichContent | null
): { checkInTime?: string; checkOutTime?: string } {
  if (listing.checkInTime) {
    return { checkInTime: listing.checkInTime, checkOutTime: listing.checkOutTime };
  }

  const policyText = richContent?.policies.flatMap((p) => p.items).join(' ') || '';
  const checkInTime = parseTimeFromPolicy(policyText, 'in') || undefined;
  const checkOutTime = parseTimeFromPolicy(policyText, 'out') || undefined;
  return { checkInTime, checkOutTime };
}

async function syncHotelAmenities(hotelId: string, names: string[]) {
  if (!names.length) return;

  const amenityIds: string[] = [];
  for (const name of [...new Set(names)].slice(0, 24)) {
    const amenity = await prisma.amenity.upsert({
      where: { name },
      create: { name, category: 'general' },
      update: {},
    });
    amenityIds.push(amenity.id);
  }

  await prisma.hotelAmenity.deleteMany({ where: { hotelId } });
  await prisma.hotelAmenity.createMany({
    data: amenityIds.map((amenityId) => ({ hotelId, amenityId })),
    skipDuplicates: true,
  });
}

function mergeGuestPhotos(
  images: { url: string; caption?: string }[],
  guestUrls: string[] | undefined
): { url: string; caption?: string }[] {
  if (!guestUrls?.length) return images;
  const seen = new Set(images.map((img) => img.url.replace(/;$/, '')));
  const merged = [...images];
  for (const url of filterValidPhotoUrls(guestUrls)) {
    const clean = url.replace(/;$/, '');
    if (!seen.has(clean)) {
      seen.add(clean);
      merged.push({ url: clean, caption: 'Guest photo' });
    }
  }
  return merged;
}

async function replaceHotelImages(hotelId: string, images: { url: string; caption?: string }[]) {
  await prisma.hotelImage.deleteMany({ where: { hotelId } });
  const filtered = images.filter((img) => isValidHotelPhotoUrl(img.url.replace(/;$/, '')));
  if (!filtered.length) return;

  await prisma.hotelImage.createMany({
    data: filtered.map((img, i) => ({
      hotelId,
      url: img.url.replace(/;$/, ''),
      caption: img.caption || null,
      isPrimary: i === 0,
      sortOrder: i,
    })),
  });
}

async function replaceRoomTypes(
  hotelId: string,
  rooms: ImportedRoom[],
  images: { url: string; caption?: string }[]
) {
  const existingRoomTypes = await prisma.roomType.findMany({
    where: { hotelId },
    select: { id: true },
  });
  const roomTypeIds = existingRoomTypes.map((rt) => rt.id);

  if (roomTypeIds.length) {
    await prisma.inventory.deleteMany({ where: { hotelId } });
    await prisma.ratePlanPrice.deleteMany({
      where: { ratePlan: { hotelId } },
    });
    await prisma.ratePlan.deleteMany({ where: { hotelId } });
    await prisma.room.deleteMany({ where: { hotelId } });
    await prisma.roomType.deleteMany({ where: { hotelId } });
  }

  const today = dateOnly(new Date());
  let roomCounter = 0;

  for (const rt of rooms) {
    const basePrice = resolveBasePriceUsd(rt);
    const galleryUrls = resolveRoomGalleryUrls(rt, images);
    const imageUrl = galleryUrls[0] || images[0]?.url.replace(/;$/, '') || null;
    const features = (rt.features || []).slice(0, 12);
    const roomType = await prisma.roomType.create({
      data: {
        hotelId,
        name: rt.name,
        description: rt.description,
        maxOccupancy: rt.maxOccupancy,
        bedType: rt.bedType,
        basePrice,
        imageUrl,
        galleryUrls,
        features,
      },
    });

    const ratePlan = await prisma.ratePlan.create({
      data: {
        hotelId,
        roomTypeId: roomType.id,
        name: 'Best Available Rate',
        description: 'Flexible rate — pay online or at hotel via E Stays',
        isRefundable: true,
        cancellationHours: 24,
      },
    });

    await prisma.ratePlanPrice.createMany({
      data: Array.from({ length: 90 }, (_, i) => {
        const date = addDays(today, i);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
        const price = isWeekend ? basePrice * 1.05 : basePrice;
        return {
          ratePlanId: ratePlan.id,
          date,
          price: Math.round(price * 100) / 100,
        };
      }),
    });

    const roomCount = rt.maxOccupancy >= 4 ? 1 : rt.maxOccupancy >= 3 ? 2 : 3;
    const createdRooms = await prisma.room.createManyAndReturn({
      data: Array.from({ length: roomCount }, (_, i) => {
        roomCounter += 1;
        return {
          hotelId,
          roomTypeId: roomType.id,
          roomNumber: `R${roomCounter}`,
          floor: Math.floor(i / 2) + 1,
          status: 'AVAILABLE' as const,
        };
      }),
    });

    const inventoryRows = createdRooms.flatMap((room) =>
      Array.from({ length: 90 }, (_, i) => ({
        hotelId,
        roomId: room.id,
        date: addDays(today, i),
        totalRooms: 1,
        availableRooms: 1,
        bookedRooms: 0,
        blockedRooms: 0,
      }))
    );

    await createManyInChunks(inventoryRows, 1000, (chunk) => prisma.inventory.createMany({ data: chunk }));
  }
}

async function importListing(slug: string, listing: ImportedListing, client: PrismaClient) {
  if (listing.error) {
    console.log(`  ✗ ${slug}: scrape error — ${listing.error}`);
    return;
  }

  const hotel = await client.hotel.findUnique({ where: { slug } });
  if (!hotel) {
    console.log(`  ✗ ${slug}: hotel not found in database (run db:seed first)`);
    return;
  }

  const brandedName = SLUG_BRANDED_NAMES[slug] || brandPropertyName(listing.propertyName || hotel.name);
  let richContent = resolveRichContent(slug, listing);
  const { checkInTime, checkOutTime } = resolveCheckTimes(listing, richContent);
  const amenityNames = [
    ...(richContent?.amenityNames || []),
    ...(listing.amenityNames || []),
    ...(richContent?.facilities.flatMap((f) => f.items) || []),
  ];

  let images = listing.images || [];
  const guestUrls = filterValidPhotoUrls([
    ...(listing.guestPhotoUrls || []),
    ...(richContent?.guestPhotoUrls || []),
  ]).filter(isValidGuestPhotoUrl);
  if (richContent && guestUrls.length) {
    richContent = { ...richContent, guestPhotoUrls: guestUrls };
  }
  images = images.filter((img) => isValidHotelPhotoUrl(img.url));
  images = mergeGuestPhotos(images, guestUrls);

  const rooms = listing.rooms || [];
  const description = brandPropertyDescription(
    listing.description || hotel.description,
    brandedName
  );

  await client.hotel.update({
    where: { id: hotel.id },
    data: {
      name: brandedName,
      description,
      richContent: richContent ? (richContent as object) : undefined,
      ...(checkInTime ? { checkInTime } : {}),
      ...(checkOutTime ? { checkOutTime } : {}),
    },
  });

  await syncHotelAmenities(hotel.id, amenityNames);
  await replaceHotelImages(hotel.id, images);
  if (rooms.length) {
    await replaceRoomTypes(hotel.id, rooms, images);
  }

  const guestCount = richContent?.guestPhotoUrls?.length || 0;
  console.log(
    `  ✓ ${brandedName}: ${images.length} photos${guestCount ? ` (${guestCount} guest)` : ''}, ` +
      `${rooms.length} room types` +
      (rooms[0]?.priceInr ? ` (from ₹${rooms[0].priceInr}/night)` : '') +
      (richContent ? ', property guide' : '')
  );
}

export async function importArListings(client: PrismaClient = prisma) {
  const data = loadImportData();
  console.log('Importing AR Hospitality listings from Agoda scrape...\n');

  for (const slug of AR_HOSPITALITY_PROPERTY_SLUGS) {
    const listing = data[slug];
    if (!listing) {
      console.log(`  ✗ ${slug}: missing from ar-agoda-import.json`);
      continue;
    }
    await importListing(slug, listing, client);
  }

  console.log('\nAR import complete.');
}

async function main() {
  await importArListings();
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
