import { hotelRepository } from '../repositories/hotel.repository';
import { AppError } from './app-error';

export async function assertHotelAccess(hotelId: string, userId: string, isAdmin: boolean) {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) throw AppError.notFound('Hotel');
  if (!isAdmin && hotel.ownerId !== userId) {
    const isStaff = hotel.staff.some((s) => s.userId === userId);
    if (!isStaff) throw AppError.forbidden('Not your property');
  }
  return hotel;
}
