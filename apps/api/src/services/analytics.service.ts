import { prisma } from '@estays/database';
import { RevenueMetrics } from '@estays/shared';
import { assertHotelAccess } from '../utils/hotel-access';
import { parseDecimal } from '../utils/helpers';

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export class AnalyticsService {
  private async computeMetrics(
    hotelIds: string[],
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<RevenueMetrics> {
    const totalRooms = await prisma.room.count({
      where: { hotelId: { in: hotelIds }, isActive: true, status: { not: 'BLOCKED' } },
    });

    const periodDays = daysBetween(startDate, endDate);
    const availableRoomNights = totalRooms * periodDays;

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: { in: hotelIds },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'] },
        checkInDate: { lte: endDate },
        checkOutDate: { gt: startDate },
      },
      select: {
        totalAmount: true,
        checkInDate: true,
        checkOutDate: true,
        createdAt: true,
      },
    });

    let totalRevenue = 0;
    let roomNightsSold = 0;

    const dayMap = new Map<string, { revenue: number; bookings: number; roomNights: number }>();
    for (const d of eachDay(startDate, endDate)) {
      dayMap.set(d.toISOString().slice(0, 10), { revenue: 0, bookings: 0, roomNights: 0 });
    }

    for (const b of bookings) {
      const amount = parseDecimal(b.totalAmount);
      const nights = daysBetween(b.checkInDate, b.checkOutDate);
      const nightlyRate = nights > 0 ? amount / nights : amount;

      for (const d of eachDay(
        b.checkInDate > startDate ? b.checkInDate : startDate,
        b.checkOutDate < endDate ? new Date(b.checkOutDate.getTime() - 86400000) : endDate
      )) {
        const key = d.toISOString().slice(0, 10);
        if (!dayMap.has(key)) continue;
        const entry = dayMap.get(key)!;
        entry.revenue += nightlyRate;
        entry.roomNights += 1;
        roomNightsSold += 1;
      }

      totalRevenue += amount;
    }

    // Count unique bookings that started in period for bookingCount
    const bookingCount = bookings.filter(
      (b) => b.checkInDate >= startDate && b.checkInDate <= endDate
    ).length;

    for (const b of bookings) {
      if (b.checkInDate >= startDate && b.checkInDate <= endDate) {
        const key = b.checkInDate.toISOString().slice(0, 10);
        const entry = dayMap.get(key);
        if (entry) entry.bookings += 1;
      }
    }

    const occupancyRate =
      availableRoomNights > 0 ? Math.round((roomNightsSold / availableRoomNights) * 10000) / 100 : 0;
    const averageDailyRate =
      roomNightsSold > 0 ? Math.round((totalRevenue / roomNightsSold) * 100) / 100 : 0;
    const revpar =
      availableRoomNights > 0
        ? Math.round((totalRevenue / availableRoomNights) * 100) / 100
        : 0;

    const breakdown = Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      revenue: Math.round(v.revenue * 100) / 100,
      bookings: v.bookings,
      occupancy:
        totalRooms > 0 ? Math.round((v.roomNights / totalRooms) * 10000) / 100 : 0,
    }));

    // Optional grouping
    if (groupBy === 'month') {
      const monthly = new Map<string, { revenue: number; bookings: number; roomNights: number }>();
      for (const row of breakdown) {
        const month = row.date.slice(0, 7);
        const m = monthly.get(month) || { revenue: 0, bookings: 0, roomNights: 0 };
        m.revenue += row.revenue;
        m.bookings += row.bookings;
        m.roomNights += (row.occupancy / 100) * totalRooms;
        monthly.set(month, m);
      }
      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        bookingCount,
        averageDailyRate,
        occupancyRate,
        revpar,
        period: { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) },
        breakdown: Array.from(monthly.entries()).map(([date, v]) => ({
          date: `${date}-01`,
          revenue: Math.round(v.revenue * 100) / 100,
          bookings: v.bookings,
          occupancy:
            totalRooms > 0 && periodDays > 0
              ? Math.round((v.roomNights / (totalRooms * 30)) * 10000) / 100
              : 0,
        })),
      };
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      bookingCount,
      averageDailyRate,
      occupancyRate,
      revpar,
      period: { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) },
      breakdown,
    };
  }

  async getHotelAnalytics(
    hotelId: string,
    userId: string,
    isAdmin: boolean,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    return this.computeMetrics(
      [hotelId],
      new Date(startDate),
      new Date(endDate),
      groupBy
    );
  }

  async getPlatformAnalytics(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
    const hotels = await prisma.hotel.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      select: { id: true },
    });
    const metrics = await this.computeMetrics(
      hotels.map((h) => h.id),
      new Date(startDate),
      new Date(endDate),
      groupBy
    );

    const byHotel = await Promise.all(
      hotels.map(async (h) => {
        const hotel = await prisma.hotel.findUnique({
          where: { id: h.id },
          select: { id: true, name: true, city: true },
        });
        const m = await this.computeMetrics([h.id], new Date(startDate), new Date(endDate), groupBy);
        return { hotel, metrics: m };
      })
    );

    return { platform: metrics, hotels: byHotel };
  }

  exportCsv(metrics: RevenueMetrics): string {
    const header = 'date,revenue,bookings,occupancy_pct';
    const rows = metrics.breakdown.map(
      (b) => `${b.date},${b.revenue},${b.bookings},${b.occupancy}`
    );
    return [header, ...rows].join('\n');
  }
}

export const analyticsService = new AnalyticsService();
