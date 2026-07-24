/**
 * Remove all hotels except the AR Hospitality collection.
 * Run: npm run purge:demo
 */
import { AR_HOSPITALITY_PROPERTY_SLUGS } from '@estays/shared';
import { createSeedPrisma } from './seed-prisma';

const prisma = createSeedPrisma();

const DEMO_GUEST_EMAILS = [
  'sarah.mitchell@email.com',
  'david.chen@email.com',
  'priya.sharma@email.com',
  'michael.brown@email.com',
  'emma.wilson@email.com',
];

async function deleteHotelWithDependencies(hotelId: string) {
  const bookingIds = (
    await prisma.booking.findMany({ where: { hotelId }, select: { id: true } })
  ).map((b) => b.id);

  if (bookingIds.length) {
    await prisma.bookingFinancial.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.settlementItem.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.folio.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  }

  await prisma.bookingFinancial.deleteMany({ where: { hotelId } });
  await prisma.settlementItem.deleteMany({ where: { hotelId } });
  await prisma.settlementAdjustment.deleteMany({ where: { hotelId } });
  await prisma.ledgerEntry.deleteMany({ where: { hotelId } });

  const settlementIds = (
    await prisma.settlement.findMany({ where: { hotelId }, select: { id: true } })
  ).map((s) => s.id);

  if (settlementIds.length) {
    await prisma.settlementDocument.deleteMany({ where: { settlementId: { in: settlementIds } } });
    await prisma.settlementAuditLog.deleteMany({ where: { settlementId: { in: settlementIds } } });
    await prisma.journalEntry.deleteMany({ where: { settlementId: { in: settlementIds } } });
    await prisma.settlement.deleteMany({ where: { id: { in: settlementIds } } });
  }

  await prisma.hotelComplaint.deleteMany({ where: { hotelId } });
  await prisma.hotel.delete({ where: { id: hotelId } });
}

export async function purgeDemoHotels() {
  const arSlugs = [...AR_HOSPITALITY_PROPERTY_SLUGS];
  const toRemove = await prisma.hotel.findMany({
    where: { slug: { notIn: arSlugs } },
    select: { id: true, slug: true, name: true },
  });

  if (!toRemove.length) {
    console.log('No demo hotels found.');
    return 0;
  }

  console.log(`Removing ${toRemove.length} demo hotels...`);

  for (const hotel of toRemove) {
    await deleteHotelWithDependencies(hotel.id);
    console.log(`  ✗ ${hotel.name}`);
  }

  return toRemove.length;
}

export async function purgeDemoUsers() {
  const partner = await prisma.user.findUnique({ where: { email: 'partner@estays.com' } });
  if (partner) {
    await prisma.userRole.deleteMany({ where: { userId: partner.id } });
    await prisma.hotelStaff.deleteMany({ where: { userId: partner.id } });
    await prisma.user.delete({ where: { id: partner.id } });
    console.log('  ✗ Removed demo partner account (partner@estays.com)');
  }

  for (const email of DEMO_GUEST_EMAILS) {
    const guest = await prisma.user.findUnique({ where: { email } });
    if (!guest) continue;
    const guestBookings = await prisma.booking.findMany({ where: { guestId: guest.id }, select: { id: true } });
    if (guestBookings.length) continue;
    await prisma.userRole.deleteMany({ where: { userId: guest.id } });
    await prisma.user.delete({ where: { id: guest.id } });
    console.log(`  ✗ Removed demo guest (${email})`);
  }
}

async function main() {
  console.log('Purging demo inventory...\n');
  const removed = await purgeDemoHotels();
  await purgeDemoUsers();
  console.log(`\nDone. Removed ${removed} demo hotel(s). AR collection preserved.`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
