'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { searchHotels } from '@/lib/api';
import { useCurrency } from '@/lib/currency';
import { PROPERTY_TYPES } from '@estays/shared';
import { DestinationAutocomplete } from '@/components/DestinationAutocomplete';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const CATEGORIES = [
  { type: '', label: 'All Stays', icon: '🏨' },
  { type: 'HOTEL', label: 'Hotels', icon: '⭐' },
  { type: 'RESORT', label: 'Resorts', icon: '🏖️' },
  { type: 'SERVICE_APARTMENT', label: 'Apartments', icon: '🏢' },
  { type: 'VILLA', label: 'Villas', icon: '🏡' },
  { type: 'HOUSE', label: 'Houses', icon: '🏠' },
  { type: 'HOMESTAY', label: 'Homestays', icon: '🛖' },
  { type: 'BOUTIQUE', label: 'Boutique', icon: '✨' },
];

const STAR_FILTERS = [
  { stars: '', label: 'Any' },
  { stars: '5', label: '5★ Luxury' },
  { stars: '4', label: '4★ Premium' },
  { stars: '3', label: '3★ Value' },
];

const LOYALTY_PROMO = {
  title: 'EStays Cash Rewards',
  desc: 'Join free & earn on every stay — Silver, Gold, VIP & Platinum tiers',
  color: 'from-navy to-navy-light',
};

const PROMOS = [
  { title: 'Lowest Rates Guaranteed', desc: 'Best prices on premium properties in every city', color: 'from-coral to-coral-light' },
  { title: 'Pay at Hotel Available', desc: 'Book now, pay when you check in — zero online hassle', color: 'from-gold to-gold-light' },
  LOYALTY_PROMO,
];

export default function HomePage() {
  const { format, currency } = useCurrency();
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
  const [featured, setFeatured] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    searchHotels({
      checkIn: formatDate(tomorrow),
      checkOut: formatDate(dayAfter),
      adults: '2',
      currency,
      limit: '12',
    }).then((res) => {
      if (res.success) setFeatured((res.data as Record<string, unknown>[]) || []);
    });
  }, [currency]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    const params: Record<string, string> = { checkIn, checkOut, adults: '2', currency, limit: '24' };
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

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy opacity-95" />
        <div className="relative max-w-7xl mx-auto px-4 py-14 sm:py-20 text-center">
          <BrandLogo href="/" size={100} showText={false} className="justify-center mb-5" />
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-3">
            Lowest Rates. Best Properties.
          </h1>
          <p className="text-gold text-lg mb-2">E Stays — Stay. Live. Belong</p>
          <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base">
            Discover handpicked hotels, resorts, villas, and apartments worldwide.
            Real-time availability. Pay online via UPI or Thai QR — or pay at the hotel.
          </p>
        </div>
      </section>

      {/* Promos */}
      <section className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROMOS.map((p) => (
            <div key={p.title} className={`bg-gradient-to-r ${p.color} text-white rounded-xl p-4 shadow-lg`}>
              <h3 className="font-semibold text-sm">{p.title}</h3>
              <p className="text-white/80 text-xs mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search */}
      <section className="max-w-5xl mx-auto px-4 mt-6 relative z-10">
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-5 border border-gold/20">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Destination</label>
              <DestinationAutocomplete
                value={destination}
                onChange={(display, search) => {
                  setDestination(display);
                  setSearchLocation(search);
                }}
                placeholder="e.g. Bangalore, Mumbai, Bangkok"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Check-in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Check-out</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none text-sm" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-coral text-white font-medium rounded-lg hover:bg-coral-light transition disabled:opacity-50 text-sm">
                {loading ? 'Searching...' : 'Search Stays'}
              </button>
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            {CATEGORIES.map((c) => (
              <button key={c.type} type="button" onClick={() => setCategory(c.type)}
                className={`text-xs px-3 py-1.5 rounded-full transition ${category === c.type ? 'bg-navy text-white' : 'bg-sand text-navy hover:bg-gold/20'}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {STAR_FILTERS.map((s) => (
              <button key={s.stars} type="button" onClick={() => setStarFilter(s.stars)}
                className={`text-xs px-3 py-1.5 rounded-full transition ${starFilter === s.stars ? 'bg-gold text-white' : 'bg-sand text-navy hover:bg-gold/20'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Featured / Results */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="font-display text-2xl font-bold text-navy mb-6">
          {searched ? `Search Results (${hotels.length})` : 'Featured Properties'}
        </h2>

        {loading && <div className="text-center py-12 text-navy/50">Finding the best stays for you...</div>}

        {!loading && searched && hotels.length === 0 && (
          <div className="text-center py-12">
            <p className="text-navy/50 text-lg">No properties found. Try a different search.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {(searched ? hotels : featured).map((hotel) => {
            const imgUrl = getHotelImage(hotel);
            return (
            <Link key={hotel.id as string}
              href={`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gold/10 group">
              <div className="h-40 relative overflow-hidden bg-gradient-to-br from-navy to-navy-light">
                {imgUrl ? (
                  <img src={imgUrl} alt={hotel.name as string} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-white">
                    <div>
                      <div className="text-2xl font-display font-bold">{hotel.starRating as number}★</div>
                      <div className="text-gold text-xs mt-0.5">{propertyLabel(hotel.propertyType as string)}</div>
                    </div>
                  </div>
                )}
                {hotel.hasAvailability && (
                  <span className="absolute top-2 right-2 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">Available</span>
                )}
                <span className="absolute bottom-2 left-2 text-[10px] bg-navy/80 text-white px-2 py-0.5 rounded-full">
                  {hotel.starRating as number}★ {propertyLabel(hotel.propertyType as string)}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-navy group-hover:text-coral transition text-sm leading-tight">
                  {hotel.name as string}
                </h3>
                <p className="text-xs text-navy/50 mt-1">{hotel.city as string}, {hotel.country as string}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-navy/40">{propertyLabel(hotel.propertyType as string)}</span>
                  {(hotel.priceFormatted || hotel.lowestPrice != null) && (
                    <div className="text-right">
                      <span className="text-lg font-bold text-navy">
                        {(hotel.priceFormatted as string) || format(hotel.lowestPrice as number)}
                      </span>
                      <span className="text-[10px] text-navy/40"> /night</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );})}
        </div>

        {!searched && (
          <div className="text-center mt-8">
            <button onClick={() => handleSearch()} className="px-6 py-2.5 bg-navy text-white rounded-lg hover:bg-navy-light transition text-sm">
              View All Properties
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
