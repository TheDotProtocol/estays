import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AR_HOSPITALITY_PROPERTY_SLUGS, PERMISSIONS, ROLE_PERMISSIONS } from '@estays/shared';
import { PROPERTIES } from './seed-properties';
import { PROPERTY_IMAGES } from './seed-images';
import { seedFinanceData } from './seed-finance';
import { importArListings } from './import-ar-listings';
import { purgeDemoHotels, purgeDemoUsers } from './purge-demo';
import { createManyInChunks, createSeedPrisma } from './seed-prisma';

const prisma = createSeedPrisma();

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

function brandPropertyName(name: string): string {
  if (name.startsWith('E Stays ')) return name;
  return `E Stays ${name}`;
}

async function seedRolesAndPermissions() {
  console.log('Seeding roles and permissions...');
  for (const [, name] of Object.entries(PERMISSIONS)) {
    const module = name.split(':')[0];
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, module, description: `Permission: ${name}` },
    });
  }

  const roleNames: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'RECEPTIONIST', 'HR_MANAGER', 'GUEST'];
  for (const roleName of roleNames) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} role` },
    });

    for (const permName of ROLE_PERMISSIONS[roleName] || []) {
      const permission = await prisma.permission.findUnique({ where: { name: permName } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }
}

async function seedAmenities() {
  console.log('Seeding amenities...');
  const amenities = [
    { name: 'Free WiFi', icon: 'wifi', category: 'connectivity' },
    { name: 'Swimming Pool', icon: 'pool', category: 'leisure' },
    { name: 'Fitness Center', icon: 'fitness', category: 'leisure' },
    { name: 'Spa', icon: 'spa', category: 'leisure' },
    { name: 'Restaurant', icon: 'restaurant', category: 'dining' },
    { name: 'Room Service', icon: 'room-service', category: 'dining' },
    { name: 'Bar', icon: 'bar', category: 'dining' },
    { name: 'Parking', icon: 'parking', category: 'transport' },
    { name: 'Airport Shuttle', icon: 'shuttle', category: 'transport' },
    { name: 'Business Center', icon: 'business', category: 'business' },
    { name: 'Conference Room', icon: 'conference', category: 'business' },
    { name: 'Laundry Service', icon: 'laundry', category: 'services' },
    { name: 'Pet Friendly', icon: 'pets', category: 'policies' },
    { name: 'Air Conditioning', icon: 'ac', category: 'room' },
    { name: 'Mini Bar', icon: 'minibar', category: 'room' },
    { name: 'Safe', icon: 'safe', category: 'room' },
    { name: 'Balcony', icon: 'balcony', category: 'room' },
    { name: 'Ocean View', icon: 'ocean', category: 'room' },
    { name: 'City View', icon: 'city', category: 'room' },
    { name: 'Breakfast Included', icon: 'breakfast', category: 'dining' },
  ];

  for (const amenity of amenities) {
    await prisma.amenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    });
  }
}

async function getOrCreateAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@estays.com';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin123!';

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) return user;

  const role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const passwordHash = await bcrypt.hash(password, 12);

  user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      emailVerified: true,
      roles: role ? { create: { roleId: role.id } } : undefined,
    },
  });
  return user;
}

async function seedHotelImages(hotelId: string, slug: string) {
  const images = PROPERTY_IMAGES[slug];
  if (!images?.length) return;

  const existing = await prisma.hotelImage.count({ where: { hotelId } });
  if (existing > 0) return;

  await prisma.hotelImage.createMany({
    data: images.map((img, i) => ({
      hotelId,
      url: img.url,
      caption: img.caption,
      isPrimary: i === 0,
      sortOrder: i,
    })),
  });
}

async function seedProperty(
  data: (typeof PROPERTIES)[0],
  ownerId: string,
  adminId: string
) {
  const brandedName = brandPropertyName(data.name);
  const existing = await prisma.hotel.findUnique({ where: { slug: data.slug } });
  if (existing) {
    const roomCount = await prisma.room.count({ where: { hotelId: existing.id } });
    if (roomCount > 0) {
      await prisma.hotel.update({
        where: { id: existing.id },
        data: {
          name: brandedName,
          propertyType: data.propertyType,
          status: data.status,
          starRating: data.starRating,
          latitude: data.latitude,
          longitude: data.longitude,
          googleMapsUrl: data.googleMapsUrl,
          isDemo: false,
        },
      });
      console.log(`  ↻ Updated: ${brandedName}`);
      return existing;
    }
    await prisma.hotel.delete({ where: { id: existing.id } });
  }

  const amenities = await prisma.amenity.findMany({
    where: { name: { in: data.amenityNames } },
  });

  const hotel = await prisma.hotel.create({
    data: {
      name: brandedName,
      slug: data.slug,
      description: data.description,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      starRating: data.starRating,
      propertyType: data.propertyType,
      status: data.status,
      latitude: data.latitude,
      longitude: data.longitude,
      googleMapsUrl: data.googleMapsUrl,
      isDemo: false,
      ownerId,
      approvedById: adminId,
      approvedAt: new Date(),
      phone: '+1-555-0100',
      email: `info@${data.slug}.com`,
      amenities: { create: amenities.map((a) => ({ amenityId: a.id })) },
      staff: {
        create: [{ userId: ownerId, title: 'Platform Manager', isPrimary: true }],
      },
    },
  });

  const today = dateOnly(new Date());

  for (const rt of data.roomTypes) {
    const roomType = await prisma.roomType.create({
      data: {
        hotelId: hotel.id,
        name: rt.name,
        description: rt.description,
        maxOccupancy: rt.maxOccupancy,
        bedType: rt.bedType,
        basePrice: rt.basePrice,
      },
    });

    const ratePlan = await prisma.ratePlan.create({
      data: {
        hotelId: hotel.id,
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
        const price = isWeekend ? rt.basePrice * 1.05 : rt.basePrice;
        return {
          ratePlanId: ratePlan.id,
          date,
          price: Math.round(price * 100) / 100,
        };
      }),
    });

    const rooms = await prisma.room.createManyAndReturn({
      data: rt.rooms.map((r) => ({
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        roomNumber: r.number,
        floor: r.floor,
        status: 'AVAILABLE' as const,
      })),
    });

    const inventoryRows = rooms.flatMap((room) =>
      Array.from({ length: 90 }, (_, i) => ({
        hotelId: hotel.id,
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

  console.log(`  ✓ ${data.propertyType}: ${hotel.name} (${data.starRating}★, ${data.city})`);
  await seedHotelImages(hotel.id, data.slug);
  return hotel;
}

async function seedArProperties(adminId: string) {
  console.log(`Seeding ${PROPERTIES.length} AR Hospitality properties...`);

  for (const prop of PROPERTIES) {
    await seedProperty(prop, adminId, adminId);
  }
}

async function markArHotelsNotDemo() {
  await prisma.hotel.updateMany({
    where: { slug: { in: [...AR_HOSPITALITY_PROPERTY_SLUGS] } },
    data: { isDemo: false },
  });
}

async function main() {
  console.log('🌱 Starting E Stays database seed...\n');

  await seedRolesAndPermissions();
  await seedAmenities();
  const admin = await getOrCreateAdmin();

  await purgeDemoHotels();
  await purgeDemoUsers();

  await seedArProperties(admin.id);
  await importArListings(prisma);
  await markArHotelsNotDemo();
  await seedFinanceData();

  const hotelCount = await prisma.hotel.count();

  console.log('\n✅ Seed completed successfully!');
  console.log(`\n${hotelCount} live properties (${PROPERTIES.length} AR Hospitality + partner listings)`);
  console.log('\nNew partner inventory is added only via partner signup & onboarding.');
  if (process.env.BOOTSTRAP_ADMIN_EMAIL) {
    console.log(`\nPlatform admin: ${process.env.BOOTSTRAP_ADMIN_EMAIL}`);
  } else {
    console.log('\nLocal dev admin: admin@estays.com / Admin123!');
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
