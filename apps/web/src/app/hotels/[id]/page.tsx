'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHotel, getHotelAvailability, getStoredUser, createBooking } from '@/lib/api';
import { useCurrency } from '@/lib/currency';
import { PROPERTY_TYPES } from '@estays/shared';

export default function HotelDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hotelId = params.id as string;
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';

  const [hotel, setHotel] = useState<Record<string, unknown> | null>(null);
  const [availability, setAvailability] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { format } = useCurrency();

  useEffect(() => {
    const fetches = [getHotel(hotelId)];
    if (checkIn && checkOut) {
      fetches.push(getHotelAvailability(hotelId, checkIn, checkOut) as never);
    }

    Promise.all(fetches).then(([hotelRes, availRes]) => {
      if (hotelRes.success) setHotel(hotelRes.data as Record<string, unknown>);
      if (availRes?.success) setAvailability(availRes.data as Record<string, unknown>);
      setLoading(false);
    });
  }, [hotelId, checkIn, checkOut]);

  const handleBook = async (ratePlanId: string) => {
    const user = getStoredUser();
    if (!user) {
      router.push(`/login?redirect=/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}`);
      return;
    }

    setBookingLoading(ratePlanId);
    setError('');

    const res = await createBooking({
      hotelId,
      ratePlanId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults: 2,
      children: 0,
    });

    if (res.success && res.data) {
      router.push(`/bookings/${(res.data as { id: string }).id}/checkout`);
    } else {
      setError(res.error?.message || 'Booking failed');
    }
    setBookingLoading(null);
  };

  if (loading) {
    return <div className="text-center py-20 text-navy/50">Loading hotel details...</div>;
  }

  if (!hotel) {
    return <div className="text-center py-20 text-navy/50">Hotel not found</div>;
  }

  const amenities = (hotel.amenities as { amenity: { name: string } }[]) || [];
  const images = (hotel.images as { url: string; isPrimary: boolean }[]) || [];
  const primaryImage = images.find((i) => i.isPrimary) || images[0];
  const availList = (availability?.availability as Record<string, unknown>[]) || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gold hover:underline mb-4 inline-block">← Back to search</Link>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gold/10">
        <div
          className="h-64 bg-gradient-to-br from-navy to-navy-light flex items-center justify-center text-white bg-cover bg-center"
          style={primaryImage ? { backgroundImage: `url(${primaryImage.url})` } : undefined}
        >
          {!primaryImage && (
            <div className="text-center">
              <div className="text-5xl font-display font-bold">{hotel.starRating as number}★</div>
              <div className="text-gold mt-2">{hotel.city as string}, {hotel.state as string}</div>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 bg-sand overflow-x-auto">
            {images.map((img, i) => (
              <img key={i} src={img.url} alt="" className="w-24 h-16 object-cover rounded-lg flex-shrink-0 border border-gold/10" />
            ))}
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-navy">{hotel.name as string}</h1>
              <p className="text-navy/50 mt-1">{hotel.address as string}</p>
              <p className="text-xs text-gold mt-1">
                {PROPERTY_TYPES[hotel.propertyType as keyof typeof PROPERTY_TYPES] || 'Hotel'} · {hotel.starRating as number}★
              </p>
            </div>
          </div>
          <p className="text-navy/70 mt-4 leading-relaxed">{hotel.description as string}</p>

          <div className="flex flex-wrap gap-2 mt-6">
            {amenities.map((a) => (
              <span key={a.amenity.name} className="text-xs bg-sand text-navy px-3 py-1 rounded-full">
                {a.amenity.name}
              </span>
            ))}
          </div>

          {checkIn && checkOut && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold text-navy mb-4">
                Availability: {checkIn} → {checkOut}
              </h2>
              <div className="space-y-4">
                {availList.map((a) => (
                  <div
                    key={a.roomTypeId as string}
                    className="flex items-center justify-between p-4 bg-sand rounded-xl"
                  >
                    <div>
                      <h3 className="font-semibold text-navy">{a.roomTypeName as string}</h3>
                      <p className="text-sm text-navy/50">
                        Up to {a.maxOccupancy as number} guests — {a.roomsAvailable as number} rooms left
                      </p>
                    </div>
                    <div className="text-right">
                      {a.available && a.ratePlanId ? (
                        <>
                          <div className="text-2xl font-bold text-navy">{format(a.totalPrice as number)}</div>
                          <div className="text-xs text-navy/40">total stay</div>
                          <button
                            onClick={() => handleBook(a.ratePlanId as string)}
                            disabled={bookingLoading === a.ratePlanId}
                            className="mt-2 px-4 py-2 bg-coral text-white text-sm rounded-lg hover:bg-coral-light transition disabled:opacity-50"
                          >
                            {bookingLoading === a.ratePlanId ? 'Booking...' : 'Book Now'}
                          </button>
                        </>
                      ) : (
                        <span className="text-red-500 font-medium">Sold Out</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
