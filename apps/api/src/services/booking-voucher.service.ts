import QRCode from 'qrcode';
import { ESTAYS_COMPANY } from '@estays/shared';
import { parseDecimal } from '../utils/helpers';

export type BookingVoucherData = {
  bookingId: string;
  bookingNumber: string;
  status: string;
  guestName: string;
  guestEmail: string;
  hotelName: string;
  hotelAddress: string;
  hotelCity: string;
  hotelCountry: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  totalAmount: string;
  currency: string;
  paidAmount: string;
  paymentMethod?: string | null;
  confirmationUrl: string;
};

export function buildVoucherPayload(data: BookingVoucherData): string {
  return JSON.stringify({
    v: 1,
    ref: data.bookingNumber,
    id: data.bookingId,
    hotel: data.hotelName,
    in: data.checkIn,
    out: data.checkOut,
  });
}

export async function generateVoucherQrPng(data: BookingVoucherData): Promise<Buffer> {
  const payload = buildVoucherPayload(data);
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#1a2b4a', light: '#ffffff' },
  });
}

export function bookingToVoucherData(booking: {
  id: string;
  bookingNumber: string;
  status: string;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  totalAmount: unknown;
  paidAmount: unknown;
  currency: string;
  guest: { firstName: string; lastName: string; email: string };
  hotel: { name: string; address: string; city: string; country: string };
  rooms: { roomType: { name: string } }[];
  payments?: { method: string; status: string }[];
}): BookingVoucherData {
  const checkIn = booking.checkInDate.toISOString().slice(0, 10);
  const checkOut = booking.checkOutDate.toISOString().slice(0, 10);
  const nights = Math.max(
    1,
    Math.ceil((booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / 86400000)
  );
  const captured = booking.payments?.find((p) => p.status === 'CAPTURED');
  const webBase = process.env.WEB_URL || ESTAYS_COMPANY.website;
  const roomTypeName = booking.rooms[0]?.roomType?.name || 'Room';

  return {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
    guestEmail: booking.guest.email,
    hotelName: booking.hotel.name,
    hotelAddress: booking.hotel.address,
    hotelCity: booking.hotel.city,
    hotelCountry: booking.hotel.country,
    roomTypeName,
    checkIn,
    checkOut,
    nights,
    adults: booking.adults,
    children: booking.children,
    totalAmount: parseDecimal(booking.totalAmount).toFixed(2),
    currency: booking.currency,
    paidAmount: parseDecimal(booking.paidAmount).toFixed(2),
    paymentMethod: captured?.method || null,
    confirmationUrl: `${webBase.replace(/\/$/, '')}/bookings/${booking.id}/confirmation`,
  };
}
