import { prisma } from '@estays/database';
import { hotelRepository } from '../repositories/hotel.repository';
import { userRepository } from '../repositories/user.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../utils/app-error';

const PLATFORM_COMMISSION_RATE = 0.15;

function toNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toNumber' in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

export class AdminService {
  async getDashboardStats() {
    const [hotelCounts, totalBookings, totalUsers, revenue, partners, transactions, openComplaints] =
      await Promise.all([
        hotelRepository.countByStatus(),
        prisma.booking.count({ where: { status: { not: 'CANCELLED' } } }),
        prisma.user.count(),
        prisma.booking.aggregate({
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'] } },
          _sum: { totalAmount: true },
        }),
        prisma.user.count({ where: { roles: { some: { role: { name: 'PARTNER' } } } } }),
        prisma.payment.count({ where: { status: { in: ['CAPTURED', 'AUTHORIZED'] } } }),
        prisma.hotelComplaint.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      ]);

    const totalHotels = Object.values(hotelCounts).reduce((a, b) => a + b, 0);
    const activeHotels = (hotelCounts['ACTIVE'] || 0) + (hotelCounts['APPROVED'] || 0);
    const pendingApprovals = hotelCounts['PENDING'] || 0;
    const totalRevenue = toNumber(revenue._sum.totalAmount);

    return {
      totalHotels,
      activeHotels,
      pendingApprovals,
      totalBookings,
      totalRevenue,
      totalUsers,
      totalPartners: partners,
      totalTransactions: transactions,
      openComplaints,
      platformCommission: totalRevenue * PLATFORM_COMMISSION_RATE,
      hotelCounts,
    };
  }

  async listPendingHotels(page: number, limit: number) {
    return hotelRepository.list({ status: 'PENDING', page, limit });
  }

  async listAllHotels(page: number, limit: number, status?: string) {
    return hotelRepository.list({ status: status as never, page, limit });
  }

  async listUsers(page: number, limit: number) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          city: true,
          country: true,
          isActive: true,
          emailVerified: true,
          loyaltyPoints: true,
          loyaltyTier: true,
          partnerStatus: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { include: { role: { select: { name: true } } } },
          _count: { select: { bookings: true } },
        },
      }),
      prisma.user.count(),
    ]);
    return {
      users: users.map((u) => ({
        ...u,
        roles: u.roles.map((r) => r.role.name),
        bookingCount: u._count.bookings,
      })),
      total,
    };
  }

  async listAllPartners() {
    const partners = await prisma.user.findMany({
      where: { roles: { some: { role: { name: 'PARTNER' } } } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
        companyAddress: true,
        partnerStatus: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        kycDocuments: {
          orderBy: { uploadedAt: 'desc' },
          select: { id: true, documentType: true, originalName: true, url: true, uploadedAt: true },
        },
        hotelStaff: {
          select: {
            title: true,
            isPrimary: true,
            hotel: { select: { id: true, name: true, city: true, status: true, starRating: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return partners.map((p) => ({
      ...p,
      properties: p.hotelStaff.map((s) => ({ ...s.hotel, title: s.title, isPrimary: s.isPrimary })),
      propertyCount: p.hotelStaff.length,
    }));
  }

  async listPendingPartners() {
    return prisma.user.findMany({
      where: {
        partnerStatus: { in: ['PENDING_KYC', 'PENDING_APPROVAL'] },
        roles: { some: { role: { name: 'PARTNER' } } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
        companyAddress: true,
        partnerStatus: true,
        createdAt: true,
        kycDocuments: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            documentType: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePartnerStatus(userId: string, status: 'APPROVED' | 'REJECTED', adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw AppError.notFound('Partner not found');
    if (!user.roles.some((r) => r.role.name === 'PARTNER')) throw AppError.badRequest('User is not a partner');

    const updated = await userRepository.updatePartnerStatus(userId, status);
    await auditRepository.log({
      userId: adminId,
      action: status === 'APPROVED' ? 'PARTNER_APPROVED' : 'PARTNER_REJECTED',
      entityType: 'User',
      entityId: userId,
      newData: { email: user.email, status },
    });
    return updated;
  }

  async listTransactions(page: number, limit: number) {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              hotel: { select: { id: true, name: true, city: true, country: true } },
              guest: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
      prisma.payment.count(),
    ]);

    return {
      transactions: payments.map((p) => ({
        id: p.id,
        amount: toNumber(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.method,
        payerName: p.payerName,
        payerEmail: p.payerEmail,
        payerPhone: p.payerPhone,
        refundMethod: p.refundMethod,
        refundedAmount: toNumber(p.refundedAmount),
        processedAt: p.processedAt,
        createdAt: p.createdAt,
        bookingNumber: p.booking.bookingNumber,
        bookingStatus: p.booking.status,
        hotel: p.booking.hotel,
        guest: p.booking.guest,
      })),
      total,
    };
  }

  async getPropertyPerformance() {
    const hotels = await prisma.hotel.findMany({
      where: { status: { in: ['ACTIVE', 'APPROVED'] } },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        starRating: true,
        propertyType: true,
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true, status: true, totalAmount: true, checkInDate: true, checkOutDate: true },
        },
        reviews: { where: { status: 'PUBLISHED' }, select: { rating: true } },
        complaints: { select: { id: true, status: true } },
        rooms: { select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });

    return hotels.map((h) => {
      const confirmed = h.bookings.filter((b) =>
        ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(b.status)
      );
      const revenue = confirmed.reduce((s, b) => s + toNumber(b.totalAmount), 0);
      const avgRating =
        h.reviews.length > 0
          ? Math.round((h.reviews.reduce((s, r) => s + r.rating, 0) / h.reviews.length) * 10) / 10
          : null;

      return {
        hotelId: h.id,
        name: h.name,
        city: h.city,
        country: h.country,
        starRating: h.starRating,
        propertyType: h.propertyType,
        totalRooms: h.rooms.length,
        totalBookings: h.bookings.length,
        confirmedBookings: confirmed.length,
        revenue,
        avgRating,
        reviewCount: h.reviews.length,
        openComplaints: h.complaints.filter((c) => ['OPEN', 'IN_PROGRESS'].includes(c.status)).length,
        totalComplaints: h.complaints.length,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  async getProfitLoss() {
    const payments = await prisma.payment.findMany({
      where: { status: { in: ['CAPTURED', 'AUTHORIZED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
      select: {
        amount: true,
        refundedAmount: true,
        status: true,
        method: true,
        createdAt: true,
        booking: {
          select: {
            hotel: { select: { id: true, name: true, city: true } },
          },
        },
      },
    });

    let grossRevenue = 0;
    let totalRefunds = 0;
    const byProperty: Record<string, { hotelId: string; name: string; city: string; gross: number; refunds: number }> = {};

    for (const p of payments) {
      const amt = toNumber(p.amount);
      const refund = toNumber(p.refundedAmount);
      if (['CAPTURED', 'AUTHORIZED'].includes(p.status)) grossRevenue += amt;
      totalRefunds += refund;

      const hotel = p.booking.hotel;
      if (!byProperty[hotel.id]) {
        byProperty[hotel.id] = { hotelId: hotel.id, name: hotel.name, city: hotel.city, gross: 0, refunds: 0 };
      }
      if (['CAPTURED', 'AUTHORIZED'].includes(p.status)) byProperty[hotel.id].gross += amt;
      byProperty[hotel.id].refunds += refund;
    }

    const netRevenue = grossRevenue - totalRefunds;
    const platformCommission = netRevenue * PLATFORM_COMMISSION_RATE;
    const partnerPayouts = netRevenue - platformCommission;

    const monthly: Record<string, { month: string; gross: number; refunds: number; net: number }> = {};
    for (const p of payments) {
      if (!['CAPTURED', 'AUTHORIZED'].includes(p.status)) continue;
      const key = p.createdAt.toISOString().slice(0, 7);
      if (!monthly[key]) monthly[key] = { month: key, gross: 0, refunds: 0, net: 0 };
      monthly[key].gross += toNumber(p.amount);
      monthly[key].refunds += toNumber(p.refundedAmount);
      monthly[key].net = monthly[key].gross - monthly[key].refunds;
    }

    return {
      grossRevenue,
      totalRefunds,
      netRevenue,
      platformCommission,
      partnerPayouts,
      commissionRate: PLATFORM_COMMISSION_RATE,
      byProperty: Object.values(byProperty)
        .map((p) => ({
          ...p,
          net: p.gross - p.refunds,
          platformShare: (p.gross - p.refunds) * PLATFORM_COMMISSION_RATE,
          partnerShare: (p.gross - p.refunds) * (1 - PLATFORM_COMMISSION_RATE),
        }))
        .sort((a, b) => b.net - a.net),
      monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  async listComplaints() {
    const complaints = await prisma.hotelComplaint.findMany({
      orderBy: { createdAt: 'desc' },
      include: { hotel: { select: { id: true, name: true, city: true, country: true } } },
    });

    const byProperty: Record<
      string,
      { hotelId: string; name: string; city: string; country: string; complaints: typeof complaints; open: number }
    > = {};

    for (const c of complaints) {
      const h = c.hotel;
      if (!byProperty[h.id]) {
        byProperty[h.id] = { hotelId: h.id, name: h.name, city: h.city, country: h.country, complaints: [], open: 0 };
      }
      byProperty[h.id].complaints.push(c);
      if (['OPEN', 'IN_PROGRESS'].includes(c.status)) byProperty[h.id].open += 1;
    }

    return {
      complaints: complaints.map((c) => ({
        id: c.id,
        guestName: c.guestName,
        guestEmail: c.guestEmail,
        category: c.category,
        subject: c.subject,
        description: c.description,
        status: c.status,
        resolution: c.resolution,
        resolvedAt: c.resolvedAt,
        createdAt: c.createdAt,
        hotel: c.hotel,
      })),
      byProperty: Object.values(byProperty).sort((a, b) => b.open - a.open || b.complaints.length - a.complaints.length),
      summary: {
        total: complaints.length,
        open: complaints.filter((c) => ['OPEN', 'IN_PROGRESS'].includes(c.status)).length,
        resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
      },
    };
  }

  async listFeedback() {
    const reviews = await prisma.hotelReview.findMany({
      orderBy: { createdAt: 'desc' },
      include: { hotel: { select: { id: true, name: true, city: true, country: true, starRating: true } } },
    });

    const byProperty: Record<
      string,
      {
        hotelId: string;
        name: string;
        city: string;
        country: string;
        starRating: number;
        reviews: typeof reviews;
        avgRating: number;
      }
    > = {};

    for (const r of reviews) {
      const h = r.hotel;
      if (!byProperty[h.id]) {
        byProperty[h.id] = {
          hotelId: h.id,
          name: h.name,
          city: h.city,
          country: h.country,
          starRating: h.starRating,
          reviews: [],
          avgRating: 0,
        };
      }
      byProperty[h.id].reviews.push(r);
    }

    for (const p of Object.values(byProperty)) {
      p.avgRating = Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length) * 10) / 10;
    }

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        guestName: r.guestName,
        guestEmail: r.guestEmail,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        status: r.status,
        partnerReply: r.partnerReply,
        repliedAt: r.repliedAt,
        createdAt: r.createdAt,
        hotel: r.hotel,
      })),
      byProperty: Object.values(byProperty).sort((a, b) => b.reviews.length - a.reviews.length),
      summary: {
        total: reviews.length,
        avgRating:
          reviews.length > 0
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
            : null,
      },
    };
  }

  async updateComplaintStatus(complaintId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', resolution?: string) {
    return prisma.hotelComplaint.update({
      where: { id: complaintId },
      data: {
        status,
        resolution: resolution || undefined,
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(status) ? new Date() : undefined,
      },
    });
  }
}

export const adminService = new AdminService();
