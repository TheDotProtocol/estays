'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchHotels } from '@/lib/api';
import { PROPERTY_TYPES, isArHospitalityProperty, brandPropertyName } from '@estays/shared';
import { DestinationAutocomplete } from '@/components/DestinationAutocomplete';
import { ArHospitalityBadge } from '@/components/ArHospitalityBadge';
import { AgodaInrPrice } from '@/components/AgodaInrPrice';
import { thumbnailImageUrl } from '@/lib/images';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const CATEGORIES = [
  { type: '', label: 'All' },
  { type: 'HOTEL', label: 'Hotels' },
  { type: 'RESORT', label: 'Resorts' },
  { type: 'SERVICE_APARTMENT', label: 'Apartments' },
  { type: 'VILLA', label: 'Villas' },
  { type: 'HOUSE', label: 'Houses' },
  { type: 'HOMESTAY', label: 'Homestays' },
  { type: 'BOUTIQUE', label: 'Boutique' },
];

const STAR_FILTERS = [
  { stars: '', label: 'Any rating' },
  { stars: '5', label: '5 star' },
  { stars: '4', label: '4 star+' },
  { stars: '3', label: '3 star+' },
];

const TRUST_ITEMS = [
  { title: 'Best rate guarantee', desc: 'Competitive pricing on every stay' },
  { title: 'Pay online or at hotel', desc: 'Flexible payment when you book' },
  { title: 'EStays Cash rewards', desc: 'Earn on every eligible booking' },
];

interface HomePageContentProps {
  initialFeatured: Record<string, unknown>[];
}

export function HomePageContent({ initialFeatured }: HomePageContentProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [destination, setDestination] = useState('');
  const [searchLocation, setSearchLocation] = useState<{ city: string; country?: string }>({ city: '' });
  const [checkIn, setCheckIn] = useState(formatDate(tomorrow));
  const [checkOut, setCheckOut] = useState(formatDate(dayAfter));
  const [category, setCategory] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [hotels, setHotels] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [featured] = useState<Record<string, unknown>[]>(initialFeatured);

  const arProperties = featured.filter((h) => isArHospitalityProperty((h.slug as string) || ''));

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    const params: Record<string, string> = { checkIn, checkOut, adults: '2', currency: 'INR', limit: '24' };
    if (searchLocation.city) params.city = searchLocation.city;
    if (searchLocation.country) params.country = searchLocation.country;
    if (category) params.propertyType = category;
    if (starFilter) params.starRating = starFilter;
    const res = await searchHotels(params);
    setHotels((res.data as Record<string, unknown>[]) || []);
    setLoading(false);
  };

  const propertyLabel = (type: string) => PROPERTY_TYPES[type as keyof typeof PROPERTY_TYPES] || 'Hotel';

  const getHotelImage = (hotel: Record<string, unknown>) => {
    const images = hotel.images as { url: string }[] | undefined;
    return images?.[0]?.url;
  };

  const renderHotelCard = (hotel: Record<string, unknown>, index: number) => {
    const imgUrl = getHotelImage(hotel);
    const isAr = isArHospitalityProperty((hotel.slug as string) || '');
    const displayName = brandPropertyName((hotel.name as string) || '');
    return (
      <Link
        key={hotel.id as string}
        href={`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
        className="group block"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted mb-3">
          {imgUrl ? (
            <img
              src={thumbnailImageUrl(imgUrl)}
              alt={displayName}
              className="h-full w-full object-cover group-hover:scale-[1.02] transition duration-300"
              loading={index < 5 ? 'eager' : 'lazy'}
              fetchPriority={index < 3 ? 'high' : 'auto'}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-ink-muted text-sm">
              {hotel.starRating as number}★ {propertyLabel(hotel.propertyType as string)}
            </div>
          )}
          {isAr && (
            <div className="absolute top-3 left-3">
              <ArHospitalityBadge />
            </div>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-ink text-[15px] leading-snug truncate group-hover:underline">
              {displayName}
            </h3>
            <p className="text-sm text-ink-muted mt-0.5 truncate">
              {hotel.city as string}, {hotel.country as string}
            </p>
            <p className="text-xs text-ink-subtle mt-1">
              {hotel.starRating as number}★ · {propertyLabel(hotel.propertyType as string)}
            </p>
          </div>
          {hotel.lowestPrice != null && (
            <AgodaInrPrice amountUsd={hotel.lowestPrice as number} size="sm" />
          )}
        </div>
      </Link>
    );
  };

  const nonArFeatured = featured.filter((h) => !isArHospitalityProperty((h.slug as string) || ''));
  const exploreStays = searched ? hotels : nonArFeatured;
  const showExploreSection = searched || nonArFeatured.length > 0;
  const exploreTitle = searched ? `${hotels.length} stays` : 'Explore more stays';

  return (
    <div className="bg-white">
      <section className="border-b border-surface-border bg-surface-muted/50">
        <div className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center">
          <h1 className="font-display text-3xl sm:text-[2.5rem] font-semibold text-ink tracking-tight">
            Find your next stay
          </h1>
          <p className="text-ink-muted mt-3 max-w-2xl mx-auto text-base leading-relaxed">
            Discover handpicked hotels, resorts, villas, and apartments worldwide.
            Real-time availability. Pay online or Pay at Hotel.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-10">
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-search border border-surface-border p-4 sm:p-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-ink mb-1.5">Where</label>
                <DestinationAutocomplete
                  value={destination}
                  onChange={(display, search) => {
                    setDestination(display);
                    setSearchLocation(search);
                  }}
                  placeholder="Search destinations"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Check in</label>
                <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Check out</label>
                <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input-field" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading} className="w-full py-2.5 btn-primary text-sm disabled:opacity-50">
                  {loading ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => setCategory(c.type)}
                  className={`chip ${category === c.type ? 'chip-active' : ''}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {STAR_FILTERS.map((s) => (
                <button
                  key={s.stars}
                  type="button"
                  onClick={() => setStarFilter(s.stars)}
                  className={`chip ${starFilter === s.stars ? 'chip-active' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {!searched && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-b border-surface-border">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="text-center sm:text-left">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="text-sm text-ink-muted mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {arProperties.length > 0 && !searched && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">AR Hospitality</p>
            <h2 className="font-display text-2xl font-semibold text-ink mt-1">Featured properties</h2>
            <p className="text-sm text-ink-muted mt-1">Direct-managed collection · rates in INR</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-8">
            {arProperties.map((hotel, i) => renderHotelCard(hotel, i))}
          </div>
        </section>
      )}

      {showExploreSection && (
        <section className="max-w-7xl mx-auto px-4 py-10 pb-16">
          <h2 className="font-display text-2xl font-semibold text-ink mb-6">{exploreTitle}</h2>

          {loading && <p className="text-center py-16 text-ink-muted">Searching…</p>}

          {!loading && searched && hotels.length === 0 && (
            <p className="text-center py-16 text-ink-muted">No properties found. Try different dates or a new destination.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
            {exploreStays.map((hotel, i) => renderHotelCard(hotel, i))}
          </div>

          {!searched && exploreStays.length > 0 && (
            <div className="text-center mt-10">
              <button type="button" onClick={() => handleSearch()} className="btn-secondary px-6 py-2.5 text-sm">
                Show all properties
              </button>
            </div>
          )}
        </section>
      )}

      {!searched && featured.length === 0 && (
        <p className="text-center py-16 text-ink-muted">No properties available. Is the API running?</p>
      )}
    </div>
  );
}
