import { prisma } from '@estays/database';
import { hotelRepository } from '../repositories/hotel.repository';
import { reviewRepository } from '../repositories/review.repository';
import { AppError } from '../utils/app-error';
import { parseDecimal } from '../utils/helpers';
import { hotelEventBus } from '../lib/event-bus';

const ONLINE_METHODS = ['UPI', 'ALIPAY', 'THAI_QR', 'STRIPE', 'CREDIT_CARD', 'DEBIT_CARD'];

function getBillingState(booking: {
  status: string;
  totalAmount: unknown;
  paidAmount: unknown;
  payments: { method: string; status: string; amount: unknown }[];
  folio: { status: string; total: unknown } | null;
}) {
  const total = parseDecimal(booking.totalAmount);
  const paid = parseDecimal(booking.paidAmount);
  const latestPayment = booking.payments[0];

  if (booking.folio?.status === 'SETTLED') return 'SETTLED';
  if (latestPayment?.method === 'PAY_AT_HOTEL' && latestPayment.status === 'AUTHORIZED') return 'PAY_AT_PROPERTY';
  if (latestPayment && ONLINE_METHODS.includes(latestPayment.method) && latestPayment.status === 'CAPTURED') return 'PAID_ONLINE';
  if (paid > 0 && paid < total) return 'PARTIAL';
  if (booking.status === 'PENDING') return 'AWAITING_PAYMENT';
  if (paid >= total) return 'PAID';
  return 'UNPAID';
}

function getPaymentChannel(payments: { method: string; status: string }[]) {
  const latest = payments[0];
  if (!latest) return 'NONE';
  if (latest.method === 'PAY_AT_HOTEL') return 'AT_PROPERTY';
  if (ONLINE_METHODS.includes(latest.method)) return 'ONLINE';
  return 'OTHER';
}

export class PartnerService {
  async getLiveDashboard(hotelId: string, userId: string, isAdmin: boolean) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw AppError.notFound('Hotel');
    if (!isAdmin && hotel.ownerId !== userId) {
      const isStaff = hotel.staff.some((s) => s.userId === userId);
      if (!isStaff) throw AppError.forbidden('Not your property');
    }

    const [bookings, reviewStats, reviews] = await Promise.all([
      prisma.booking.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          payments: { orderBy: { createdAt: 'desc' } },
          folio: { include: { items: true } },
          rooms: { include: { roomType: { select: { name: true } } } },
        },
      }),
      reviewRepository.getStats(hotelId),
      reviewRepository.listByHotel(hotelId, 1, 10),
    ]);

    const enrichedBookings = bookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      status: b.status,
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      totalAmount: parseDecimal(b.totalAmount),
      paidAmount: parseDecimal(b.paidAmount),
      guest: b.guest,
      roomType: b.rooms[0]?.roomType?.name,
      paymentChannel: getPaymentChannel(b.payments),
      paymentMethod: b.payments[0]?.method || null,
      paymentStatus: b.payments[0]?.status || null,
      billingState: getBillingState(b),
      folio: b.folio
        ? {
            id: b.folio.id,
            status: b.folio.status,
            subtotal: parseDecimal(b.folio.subtotal),
            taxAmount: parseDecimal(b.folio.taxAmount),
            total: parseDecimal(b.folio.total),
            items: b.folio.items.map((i) => ({
              type: i.type,
              description: i.description,
              totalPrice: parseDecimal(i.totalPrice),
            })),
          }
        : null,
    }));

    const stats = {
      totalBookings: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
      checkedIn: bookings.filter((b) => b.status === 'CHECKED_IN').length,
      paidOnline: enrichedBookings.filter((b) => b.paymentChannel === 'ONLINE').length,
      payAtProperty: enrichedBookings.filter((b) => b.paymentChannel === 'AT_PROPERTY').length,
      pendingPayment: enrichedBookings.filter((b) => b.billingState === 'AWAITING_PAYMENT').length,
      openFolios: enrichedBookings.filter((b) => b.folio?.status === 'OPEN').length,
    };

    return {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        address: hotel.address,
        city: hotel.city,
        state: hotel.state,
        country: hotel.country,
        postalCode: hotel.postalCode,
        phone: hotel.phone,
        email: hotel.email,
        website: hotel.website,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        googleMapsUrl: hotel.googleMapsUrl,
        googlePlaceId: hotel.googlePlaceId,
        socialFacebook: hotel.socialFacebook,
        socialInstagram: hotel.socialInstagram,
        socialTwitter: hotel.socialTwitter,
        socialLinkedIn: hotel.socialLinkedIn,
        socialYoutube: hotel.socialYoutube,
        checkInTime: hotel.checkInTime,
        checkOutTime: hotel.checkOutTime,
        status: hotel.status,
        starRating: hotel.starRating,
      },
      stats,
      bookings: enrichedBookings,
      reviews: reviews.reviews,
      reviewStats,
      lastUpdated: new Date().toISOString(),
    };
  }

  async replyToReview(reviewId: string, hotelId: string, userId: string, reply: string, isAdmin: boolean) {
    const review = await reviewRepository.findById(reviewId);
    if (!review || review.hotelId !== hotelId) throw AppError.notFound('Review');

    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw AppError.notFound('Hotel');
    if (!isAdmin && hotel.ownerId !== userId) throw AppError.forbidden('Not your property');

    const updated = await reviewRepository.updateReply(reviewId, reply);
    hotelEventBus.publish({
      hotelId,
      type: 'review.added',
      timestamp: new Date().toISOString(),
      data: { reviewId },
    });
    return updated;
  }

  async updateReviewStatus(
    reviewId: string,
    hotelId: string,
    userId: string,
    status: 'PUBLISHED' | 'HIDDEN' | 'PENDING',
    isAdmin: boolean
  ) {
    const review = await reviewRepository.findById(reviewId);
    if (!review || review.hotelId !== hotelId) throw AppError.notFound('Review');

    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw AppError.notFound('Hotel');
    if (!isAdmin && hotel.ownerId !== userId) throw AppError.forbidden('Not your property');

    return reviewRepository.updateStatus(reviewId, status);
  }
}

export const partnerService = new PartnerService();
