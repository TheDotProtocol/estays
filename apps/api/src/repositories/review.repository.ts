import { prisma } from '@estays/database';

export class ReviewRepository {
  async listByHotel(hotelId: string, page = 1, limit = 20) {
    const [reviews, total] = await Promise.all([
      prisma.hotelReview.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hotelReview.count({ where: { hotelId } }),
    ]);
    return { reviews, total };
  }

  async findById(id: string) {
    return prisma.hotelReview.findUnique({ where: { id } });
  }

  async updateReply(id: string, reply: string) {
    return prisma.hotelReview.update({
      where: { id },
      data: { partnerReply: reply, repliedAt: new Date() },
    });
  }

  async updateStatus(id: string, status: 'PUBLISHED' | 'HIDDEN' | 'PENDING') {
    return prisma.hotelReview.update({
      where: { id },
      data: { status },
    });
  }

  async getStats(hotelId: string) {
    const agg = await prisma.hotelReview.aggregate({
      where: { hotelId, status: 'PUBLISHED' },
      _avg: { rating: true },
      _count: true,
    });
    return {
      averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      totalReviews: agg._count,
    };
  }
}

export const reviewRepository = new ReviewRepository();
