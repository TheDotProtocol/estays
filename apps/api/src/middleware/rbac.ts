import { Response, NextFunction } from 'express';
import { prisma } from '@estays/database';
import { AuthRequest } from './auth';
import { AppError } from '../utils/app-error';
import { RoleName } from '@estays/shared';

export function requirePermission(...permissions: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();

    const hasPermission = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasPermission) {
      throw AppError.forbidden(`Missing required permission: ${permissions.join(' or ')}`);
    }
    next();
  };
}

export function requireRole(...roles: RoleName[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();

    const hasRole = roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      throw AppError.forbidden(`Missing required role: ${roles.join(' or ')}`);
    }
    next();
  };
}

export async function requireHotelAccess(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();

    const isAdmin = req.user.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    if (isAdmin) return next();

    const hotelId = req.params.hotelId || req.body.hotelId || (req.query.hotelId as string);
    if (!hotelId) return next();

    const hotelIds = req.user.hotelIds || [];
    if (hotelIds.includes(hotelId)) return next();

    // JWT hotelIds are set at login — verify ownership/staff in DB for newly created hotels
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        ownerId: true,
        staff: { where: { userId: req.user.sub }, select: { id: true }, take: 1 },
      },
    });
    if (!hotel) throw AppError.notFound('Hotel');

    if (hotel.ownerId === req.user.sub || hotel.staff.length > 0) {
      return next();
    }

    throw AppError.forbidden('You do not have access to this hotel');
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) throw AppError.unauthorized();
  next();
}
