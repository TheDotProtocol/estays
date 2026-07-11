/**
 * Production bootstrap — roles, permissions, amenities only.
 * Do NOT create demo hotels, bookings, or test passwords.
 *
 * Optional: set BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD to create one SUPER_ADMIN.
 */
import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@estays/shared';

const prisma = new PrismaClient();

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
  const amenities = [
    'WiFi', 'Parking', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service',
    'Air Conditioning', 'Breakfast', 'Pet Friendly', 'Airport Shuttle', 'Laundry',
    'Business Center', 'Conference Room', 'Beach Access', 'Kitchen', 'Balcony',
    'Sea View', 'Mountain View', 'Garden', 'EV Charging', 'Wheelchair Accessible',
  ];
  for (const name of amenities) {
    await prisma.amenity.upsert({
      where: { name },
      update: {},
      create: { name, icon: name.toLowerCase().replace(/\s+/g, '-') },
    });
  }
  console.log(`Seeded ${amenities.length} amenities`);
}

async function seedBootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Skipping bootstrap admin (set BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD)');
    return;
  }

  const role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (!role) throw new Error('SUPER_ADMIN role missing');

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, emailVerified: true },
    create: {
      email,
      passwordHash: hash,
      firstName: 'Platform',
      lastName: 'Admin',
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  console.log(`Bootstrap SUPER_ADMIN ready: ${email}`);
}

async function main() {
  await seedRolesAndPermissions();
  await seedAmenities();
  await seedBootstrapAdmin();
  console.log('Production seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
