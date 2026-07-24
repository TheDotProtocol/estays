'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHotel, getHotelAvailability, ensureAuthSession, clearTokens, createBooking } from '@/lib/api';
import { PROPERTY_TYPES, isArHospitalityProperty, brandPropertyName, isValidHotelPhotoUrl, type HotelRichContent } from '@estays/shared';
import { ArHospitalityBadge } from '@/components/ArHospitalityBadge';
import { ImageCarousel } from '@/components/ImageCarousel';
import { HotelPropertyGuide } from '@/components/HotelPropertyGuide';
import { RoomOptionCard, type RoomOptionData } from '@/components/RoomOptionCard';
import { formatStayDateLabel, resolveRoomImagesFromHotel } from '@/lib/room-images';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultCheckIn() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

function defaultCheckOut() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return formatDate(d);
}

export default function HotelDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hotelId = params.id as string;

  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || defaultCheckIn());
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || defaultCheckOut());
  const [hotel, setHotel] = useState<Record<string, unknown> | null>(null);
  const [availability, setAvailability] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [availLoading, setAvailLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const nights =
    checkIn && checkOut
      ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 1;

  const loadHotel = async () => {
    setLoading(true);
    setLoadError('');
    setHotel(null);
    const hotelRes = await getHotel(hotelId);
    if (hotelRes.success && hotelRes.data) {
      setHotel(hotelRes.data as Record<string, unknown>);
    } else {
      setLoadError(
        hotelRes.error?.code === 'NOT_FOUND'
          ? 'This property is no longer available.'
          : hotelRes.error?.message || 'Unable to load property. The server may be restarting — try again.'
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadHotel();
  }, [hotelId]);

  const loadAvailability = async (from?: string, to?: string) => {
    const inDate = from || checkIn;
    const outDate = to || checkOut;
    if (!inDate || !outDate || new Date(outDate) <= new Date(inDate)) {
      setError('Check-out must be after check-in.');
      return false;
    }
    setError('');
    setAvailLoading(true);
    const availRes = await getHotelAvailability(hotelId, inDate, outDate);
    const a = availRes as { success?: boolean; data?: Record<string, unknown> };
    if (a?.success) setAvailability(a.data as Record<string, unknown>);
    setAvailLoading(false);
    const qs = new URLSearchParams({ checkIn: inDate, checkOut: outDate });
    router.replace(`/hotels/${hotelId}?${qs.toString()}`, { scroll: false });
    return true;
  };

  useEffect(() => {
    if (checkIn && checkOut && new Date(checkOut) > new Date(checkIn)) {
      loadAvailability(checkIn, checkOut);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const handleBook = async (ratePlanId: string) => {
    const redirect = `/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}`;

    const authed = await ensureAuthSession();
    if (!authed) {
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      setError('Select valid dates before reserving.');
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
    } else if (res.error?.code === 'INVALID_TOKEN' || res.error?.message?.includes('access token')) {
      clearTokens();
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
    } else {
      setError(res.error?.message || 'Booking failed. Please try again.');
    }
    setBookingLoading(null);
  };

  if (loading) {
    return <div className="text-center py-24 text-ink-muted">Loading property…</div>;
  }

  if (!hotel) {
    return (
      <div className="text-center py-24 px-4">
        <p className="text-ink-muted mb-4">{loadError || 'Property not found'}</p>
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={() => void loadHotel()} className="btn-secondary px-4 py-2 text-sm">
            Retry
          </button>
          <Link href="/" className="btn-primary px-4 py-2 text-sm">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const amenities = (hotel.amenities as { amenity: { name: string } }[]) || [];
  const images = ((hotel.images as { url: string; isPrimary: boolean; caption?: string | null }[]) || []).filter(
    (img) => isValidHotelPhotoUrl(img.url)
  );
  const availList = (availability?.availability as Record<string, unknown>[]) || [];
  const roomTypes =
    (hotel.roomTypes as {
      id: string;
      name: string;
      description?: string;
      maxOccupancy: number;
      basePrice: string | number;
      bedType?: string | null;
      imageUrl?: string | null;
      galleryUrls?: string[] | null;
      features?: string[] | null;
    }[]) || [];
  const isAr = isArHospitalityProperty((hotel.slug as string) || '');
  const richContent = hotel.richContent as HotelRichContent | null | undefined;
  const displayName = brandPropertyName((hotel.name as string) || '');
  const checkInTime = (hotel.checkInTime as string) || '14:00';
  const checkOutTime = (hotel.checkOutTime as string) || '12:00';

  const buildRoomOptions = (): RoomOptionData[] => {
    if (checkIn && checkOut && availList.length > 0) {
      return availList.map((a) => {
        const rt = roomTypes.find((r) => r.id === a.roomTypeId);
        const nightlyUsd = nights > 0 ? (a.totalPrice as number) / nights : (a.basePrice as number);
        return {
          id: a.roomTypeId as string,
          name: a.roomTypeName as string,
          description: rt?.description,
          maxOccupancy: a.maxOccupancy as number,
          bedType: (a.bedType as string) || rt?.bedType,
          imageUrl: (a.imageUrl as string) || rt?.imageUrl,
          galleryUrls: (a.galleryUrls as string[]) || rt?.galleryUrls,
          features: (a.features as string[]) || rt?.features,
          nightlyUsd,
          nights,
          available: Boolean(a.available && a.ratePlanId),
          ratePlanId: a.ratePlanId as string | undefined,
          roomsAvailable: a.roomsAvailable as number | undefined,
        };
      });
    }

    return roomTypes.map((rt) => ({
      id: rt.id,
      name: rt.name,
      description: rt.description,
      maxOccupancy: rt.maxOccupancy,
      bedType: rt.bedType,
      imageUrl: rt.imageUrl,
      galleryUrls: rt.galleryUrls,
      features: rt.features,
      nightlyUsd: Number(rt.basePrice),
      nights,
      available: false,
      ratePlanId: null,
    }));
  };

  const roomOptions = buildRoomOptions();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink mb-6 inline-block">
        ← Back to search
      </Link>

      {error && (
        <div className="mb-4 p-3 bg-brand-soft text-brand border border-brand/20 text-sm rounded-xl">{error}</div>
      )}

      <div className="relative mb-8">
        <ImageCarousel images={images} alt={displayName} />
        {isAr && (
          <div className="absolute top-4 left-4 z-10">
            <ArHospitalityBadge className="text-[11px] px-3 py-1.5" />
          </div>
        )}
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
        {displayName}
      </h1>
      <p className="text-ink-muted mt-1">{hotel.address as string}</p>
      {richContent?.tagline && (
        <p className="text-sm text-ink mt-2">{richContent.tagline}</p>
      )}
      <p className="text-sm text-ink-subtle mt-2">
        {PROPERTY_TYPES[hotel.propertyType as keyof typeof PROPERTY_TYPES] || 'Hotel'} · {hotel.starRating as number} star
      </p>

      <hr className="my-6 border-surface-border" />
      <div>
        <p className={`text-ink leading-relaxed whitespace-pre-line ${aboutExpanded ? '' : 'line-clamp-6'}`}>
          {hotel.description as string}
        </p>
        {(hotel.description as string)?.length > 320 && (
          <button
            type="button"
            onClick={() => setAboutExpanded((v) => !v)}
            className="text-sm text-brand font-medium mt-2 hover:underline"
          >
            {aboutExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        {amenities.slice(0, 16).map((a) => (
          <span
            key={a.amenity.name}
            className="text-xs bg-surface-muted text-ink-muted px-3 py-1.5 rounded-full border border-surface-border"
          >
            {a.amenity.name}
          </span>
        ))}
      </div>

      {richContent && (
        <HotelPropertyGuide content={richContent} propertyName={displayName} />
      )}

      {/* Agoda-style room selection */}
      <section className="mt-10 border border-surface-border rounded-2xl overflow-hidden bg-white shadow-card">
        <div className="bg-surface-muted/60 border-b border-surface-border px-4 sm:px-6 py-4">
          <h2 className="font-semibold text-ink text-lg">Choose your room</h2>
          <p className="text-xs text-ink-muted mt-1">Tap a room photo to browse the gallery before you book</p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Check in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input-field text-sm" />
              <p className="text-[11px] text-ink-muted mt-1">{formatStayDateLabel(checkIn)} · {checkInTime}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Check out</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input-field text-sm" />
              <p className="text-[11px] text-ink-muted mt-1">{formatStayDateLabel(checkOut)} · {checkOutTime}</p>
            </div>
            <button type="button" onClick={() => void loadAvailability()} className="py-2.5 px-4 btn-primary text-sm whitespace-nowrap">
              Update
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4">
          {availLoading && <p className="text-sm text-ink-muted">Checking availability…</p>}

          {!availLoading && roomOptions.length === 0 && (
            <p className="text-sm text-ink-muted py-8 text-center">No rooms available for these dates.</p>
          )}

          {roomOptions.map((room) => {
            const rt = roomTypes.find((r) => r.id === room.id);
            const gallery = resolveRoomImagesFromHotel(
              room.name,
              room.imageUrl,
              room.galleryUrls || rt?.galleryUrls,
              images
            );
            return (
              <RoomOptionCard
                key={room.id}
                room={room}
                images={gallery}
                bookingLoading={bookingLoading === room.ratePlanId}
                onReserve={handleBook}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
