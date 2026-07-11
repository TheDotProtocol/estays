import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@estays/shared';
import { PROPERTIES } from './seed-properties';
import { PROPERTY_IMAGES } from './seed-images';
import { seedAdminDemoData } from './seed-admin-demo';
import { seedFinanceData } from './seed-finance';

const prisma = new PrismaClient();

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

  const roleNames: RoleName[] = ['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'RECEPTIONIST', 'GUEST'];
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

async function getOrCreateUser(u: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: RoleName;
  partnerStatus?: 'PENDING_KYC' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  companyName?: string;
}) {
  let user = await prisma.user.findUnique({ where: { email: u.email } });
  if (user) {
    if (u.partnerStatus) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { partnerStatus: u.partnerStatus, emailVerified: true },
      });
    }
    return user;
  }

  const role = await prisma.role.findUnique({ where: { name: u.role } });
  const passwordHash = await bcrypt.hash(u.password, 12);

  user = await prisma.user.create({
    data: {
      email: u.email,
      passwordHash,
      firstName: u.firstName,
      lastName: u.lastName,
      emailVerified: true,
      loyaltyPoints: 0,
      loyaltyTier: 'SILVER',
      partnerStatus: u.partnerStatus,
      companyName: u.companyName,
      roles: role ? { create: { roleId: role.id } } : undefined,
    },
  });
  return user;
}

async function seedUsers() {
  console.log('Seeding marketing accounts...');
  return {
    admin: await getOrCreateUser({
      email: 'admin@estays.com', password: 'Admin123!',
      firstName: 'System', lastName: 'Administrator', role: 'SUPER_ADMIN',
    }),
    partner: await getOrCreateUser({
      email: 'partner@estays.com', password: 'Partner123!',
      firstName: 'James', lastName: 'Morrison', role: 'PARTNER',
      partnerStatus: 'APPROVED',
      companyName: 'E Stays Hotels LLC',
    }),
  };
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
  adminId: string,
  staff: { userId: string; title: string; isPrimary?: boolean }[]
) {
  const brandedName = brandPropertyName(data.name);
  const existing = await prisma.hotel.findUnique({ where: { slug: data.slug } });
  if (existing) {
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
        isDemo: true,
      },
    });
    await seedHotelImages(existing.id, data.slug);
    await seedHotelReviews(existing.id, data.slug);
    console.log(`  ↻ Updated: ${brandedName}`);
    return existing;
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
      isDemo: true,
      ownerId,
      approvedById: adminId,
      approvedAt: new Date(),
      phone: '+1-555-0100',
      email: `info@${data.slug}.com`,
      amenities: { create: amenities.map((a) => ({ amenityId: a.id })) },
      staff: {
        create: staff.map((s) => ({
          userId: s.userId,
          title: s.title,
          isPrimary: s.isPrimary ?? false,
        })),
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
        description: 'Flexible rate with free cancellation',
        isRefundable: true,
        cancellationHours: 24,
      },
    });

    for (let i = 0; i < 90; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const price = isWeekend ? rt.basePrice * 1.2 : rt.basePrice;

      await prisma.ratePlanPrice.create({
        data: {
          ratePlanId: ratePlan.id,
          date,
          price: Math.round(price * 100) / 100,
        },
      });
    }

    for (const r of rt.rooms) {
      const room = await prisma.room.create({
        data: {
          hotelId: hotel.id,
          roomTypeId: roomType.id,
          roomNumber: r.number,
          floor: r.floor,
          status: 'AVAILABLE',
        },
      });

      for (let i = 0; i < 90; i++) {
        const date = addDays(today, i);
        await prisma.inventory.create({
          data: {
            hotelId: hotel.id,
            roomId: room.id,
            date,
            totalRooms: 1,
            availableRooms: 1,
            bookedRooms: 0,
            blockedRooms: 0,
          },
        });
      }
    }
  }

  console.log(`  ✓ ${data.propertyType}: ${hotel.name} (${data.starRating}★, ${data.city})`);
  await seedHotelImages(hotel.id, data.slug);
  await seedHotelReviews(hotel.id, data.slug);
  return hotel;
}

async function seedHotelReviews(hotelId: string, slug: string) {
  const existing = await prisma.hotelReview.count({ where: { hotelId } });
  if (existing > 0) return;

  const indiaReviews: Record<string, { guestName: string; rating: number; title: string; comment: string }[]> = {
    'bengaluru-tech-park-hotel': [
      { guestName: 'Rahul S.', rating: 5, title: 'Perfect for business', comment: 'Great location near tech parks. Fast WiFi and excellent breakfast.' },
      { guestName: 'Priya M.', rating: 4, title: 'Comfortable stay', comment: 'Clean rooms and friendly staff. Rooftop bar was a nice touch.' },
    ],
    'imperial-grand-mumbai': [
      { guestName: 'Ananya K.', rating: 5, title: 'Stunning harbour views', comment: 'The suite overlooking Marine Drive was breathtaking. World-class service.' },
      { guestName: 'Vikram P.', rating: 5, title: 'Best in Mumbai', comment: 'E Stays Imperial Grand sets the standard. Will return every trip.' },
    ],
    'kerala-backwater-resort': [
      { guestName: 'Deepa R.', rating: 5, title: 'Paradise on backwaters', comment: 'Houseboat excursion was magical. Ayurvedic spa was rejuvenating.' },
    ],
  };

  const reviews = indiaReviews[slug] || [];
  if (reviews.length === 0) return;

  await prisma.hotelReview.createMany({
    data: reviews.map((r) => ({ hotelId, ...r, status: 'PUBLISHED' as const })),
  });
}

async function seedAllProperties(users: Awaited<ReturnType<typeof seedUsers>>) {
  console.log(`Seeding ${PROPERTIES.length} properties...`);

  for (const prop of PROPERTIES) {
    const staff = [{ userId: users.partner.id, title: 'Owner', isPrimary: true }];
    await seedProperty(prop, users.partner.id, users.admin.id, staff);
  }
}

async function main() {
  console.log('🌱 Starting E Stays database seed...\n');

  await seedRolesAndPermissions();
  await seedAmenities();
  const users = await seedUsers();
  await seedAllProperties(users);
  await seedAdminDemoData();
  await seedFinanceData();

  console.log('\n✅ Seed completed successfully!');
  console.log(`\n${PROPERTIES.length} properties across Hotels, Resorts, Apartments, Villas, Houses & Homestays`);
  console.log('\nMarketing demo accounts (for presentations only):');
  console.log('  Admin:   admin@estays.com / Admin123!');
  console.log('  Partner: partner@estays.com / Partner123!');
  console.log('\nGuests and new partners must register with email OTP verification.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
