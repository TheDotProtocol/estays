'use client';

import { useEffect, useRef, useState } from 'react';
import {
  onboardProperty,
  getAmenities,
  getCountries,
  searchLocations,
  uploadHotelImages,
  formatApiError,
} from '@/lib/api';
import { brandPropertyName, stripPropertyNamePrefix, COUNTRIES } from '@estays/shared';

type Step = 'basics' | 'location' | 'contact' | 'facilities' | 'rooms' | 'photos' | 'review';

type RoomDraft = {
  name: string;
  description: string;
  bedType: string;
  maxOccupancy: number;
  basePrice: number;
  roomCount: number;
};

const STEPS: { id: Step; label: string }[] = [
  { id: 'basics', label: 'Property' },
  { id: 'location', label: 'Location' },
  { id: 'contact', label: 'Details' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'photos', label: 'Photos' },
  { id: 'review', label: 'Review' },
];

const PROPERTY_TYPES = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'RESORT', label: 'Resort' },
  { value: 'SERVICE_APARTMENT', label: 'Apartment / Suite' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'HOUSE', label: 'House' },
  { value: 'HOMESTAY', label: 'Homestay' },
  { value: 'BOUTIQUE', label: 'Boutique' },
];

interface Props {
  onComplete: (hotelId: string, hotelName: string) => void;
  onCancel: () => void;
}

export function PropertyOnboardingWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>('basics');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [propertyName, setPropertyName] = useState('');
  const [acceptBranding, setAcceptBranding] = useState(false);
  const [propertyType, setPropertyType] = useState('HOTEL');
  const [starRating, setStarRating] = useState(3);

  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<{ city: string; state: string; country: string; label: string }[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  const [amenities, setAmenities] = useState<{ id: string; name: string; category: string }[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [rooms, setRooms] = useState<RoomDraft[]>([
    { name: 'Standard Room', description: '', bedType: 'Queen', maxOccupancy: 2, basePrice: 99, roomCount: 2 },
  ]);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const brandedName = brandPropertyName(propertyName);
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    getAmenities().then((res) => {
      if (res.success) setAmenities(res.data || []);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCities = async (q: string, c: string) => {
    const res = await searchLocations(q, c || undefined);
    if (res.success) {
      setCitySuggestions((res.data as typeof citySuggestions) || []);
      setCityOpen(true);
    }
  };

  const selectCity = (dest: { city: string; state: string; country: string }) => {
    setCity(dest.city);
    setState(dest.state);
    if (!country) setCountry(dest.country);
    setCityOpen(false);
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const updateRoom = (idx: number, patch: Partial<RoomDraft>) => {
    setRooms((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRoom = () => {
    setRooms((prev) => [
      ...prev,
      { name: '', description: '', bedType: 'King', maxOccupancy: 2, basePrice: 149, roomCount: 1 },
    ]);
  };

  const removeRoom = (idx: number) => {
    if (rooms.length <= 1) return;
    setRooms((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateStep = (s: Step): string | null => {
    switch (s) {
      case 'basics':
        if (!propertyName.trim()) return 'Enter your property name.';
        if (!acceptBranding) return 'Accept the E Stays branding to continue.';
        return null;
      case 'location':
        if (!country) return 'Select a country.';
        if (!city.trim()) return 'Enter or select a city.';
        if (!address.trim() || address.length < 5) return 'Enter a full street address.';
        return null;
      case 'contact':
        if (!phone.trim() || phone.length < 5) return 'Enter a contact phone number.';
        if (!description.trim() || description.length < 10) return 'Description must be at least 10 characters.';
        return null;
      case 'facilities':
        if (selectedAmenities.length === 0) return 'Select at least one facility / amenity.';
        return null;
      case 'rooms':
        for (const r of rooms) {
          if (!r.name.trim()) return 'Each room type needs a name.';
          if (r.basePrice <= 0) return 'Enter a valid nightly price for each room type.';
          if (r.roomCount < 1) return 'Each room type needs at least 1 room.';
        }
        return null;
      case 'photos':
        if (photoFiles.length < 1) return 'Upload at least one property photo (rooms, lobby, facilities, etc.).';
        return null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    setError('');
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const handleSubmit = async () => {
    for (const s of STEPS.slice(0, -1)) {
      const err = validateStep(s.id);
      if (err) {
        setError(err);
        setStep(s.id);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    const onboardRes = await onboardProperty({
      name: brandedName,
      description,
      address,
      city,
      state: state || undefined,
      country,
      postalCode: postalCode || undefined,
      phone,
      email: email || undefined,
      propertyType,
      starRating,
      checkInTime,
      checkOutTime,
      amenityIds: selectedAmenities,
      brandAccepted: true,
      roomTypes: rooms.map((room) => ({
        name: room.name,
        description: room.description || undefined,
        bedType: room.bedType,
        maxOccupancy: room.maxOccupancy,
        basePrice: room.basePrice,
        roomCount: room.roomCount,
      })),
    });

    if (!onboardRes.success || !onboardRes.data?.hotel) {
      setError(formatApiError(onboardRes));
      setSubmitting(false);
      return;
    }

    const hotelId = onboardRes.data.hotel.id;

    const dt = new DataTransfer();
    photoFiles.forEach((f) => dt.items.add(f));
    const uploadRes = await uploadHotelImages(hotelId, dt.files, true);
    if (!uploadRes.success) {
      setError(`Photo upload error: ${uploadRes.error?.message || 'Upload failed'}`);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onComplete(hotelId, brandedName);
  };

  const amenityGroups = amenities.reduce<Record<string, typeof amenities>>((acc, a) => {
    (acc[a.category] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl">
      {/* Progress */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center shrink-0">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
              step === s.id ? 'bg-navy text-white' : i < stepIndex ? 'bg-green-100 text-green-700' : 'bg-sand text-navy/50'
            }`}>
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{i + 1}</span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && <span className="text-navy/20 mx-0.5">›</span>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gold/10 p-6">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* Step 1: Basics */}
        {step === 'basics' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-navy">Property & Branding</h2>
            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">Your Property Name *</label>
              <input
                value={propertyName}
                onChange={(e) => setPropertyName(stripPropertyNamePrefix(e.target.value))}
                placeholder="e.g. Grand Plaza Hotel, Goa Beach Resort"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-[11px] text-navy/40 mt-1">Enter your name only — &quot;E Stays&quot; is added automatically.</p>
            </div>
            {brandedName && (
              <div className="bg-gradient-to-r from-navy to-navy-light text-white rounded-xl p-4">
                <p className="text-[11px] text-gold uppercase tracking-wide mb-1">Listed on E Stays as</p>
                <p className="font-display text-lg font-bold">{brandedName}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-navy/70 mb-1">Property Type *</label>
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy/70 mb-1">Star Rating *</label>
                <select value={starRating} onChange={(e) => setStarRating(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-start gap-3 bg-sand rounded-xl p-4 cursor-pointer">
              <input type="checkbox" checked={acceptBranding} onChange={(e) => setAcceptBranding(e.target.checked)} disabled={!brandedName} className="mt-0.5 accent-coral" />
              <span className="text-sm text-navy/80">
                I accept that my property will be listed as <strong>{brandedName || 'E Stays [Name]'}</strong> on E Stays.
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 'location' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-navy">Location</h2>
            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">Country *</label>
              <select value={country} onChange={(e) => { setCountry(e.target.value); setCity(''); setState(''); }} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select country...</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div ref={cityRef} className="relative">
              <label className="block text-xs font-medium text-navy/70 mb-1">City *</label>
              <input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  fetchCities(e.target.value, country);
                }}
                onFocus={() => country && fetchCities(city, country)}
                placeholder={country ? 'Search or type city name' : 'Select country first'}
                disabled={!country}
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50"
              />
              {cityOpen && citySuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gold/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {citySuggestions.map((s) => (
                    <button key={s.label} type="button" onClick={() => selectCity(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-sand border-b border-gold/5 last:border-0">
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-navy/40 mt-1">Pick from suggestions or type any city worldwide.</p>
            </div>
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State / Province / Region" className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address *" className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal / ZIP code" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        )}

        {/* Step 3: Contact & Description */}
        {step === 'contact' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-navy">Contact & Description</h2>
            <div className="grid grid-cols-2 gap-3">
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contact phone *" className="px-3 py-2 border rounded-lg text-sm" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} placeholder="Check-in (14:00)" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} placeholder="Check-out (11:00)" className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your property — location highlights, atmosphere, what makes it special (min 10 characters) *"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        )}

        {/* Step 4: Facilities */}
        {step === 'facilities' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-navy">Facilities & Amenities</h2>
            <p className="text-xs text-navy/50">Select all facilities your property offers. You&apos;ll upload facility photos in the next steps.</p>
            {Object.entries(amenityGroups).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-medium text-navy/50 uppercase mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition ${
                        selectedAmenities.includes(a.id)
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-navy border-gold/20 hover:border-gold'
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-sm text-navy/60">{selectedAmenities.length} selected</p>
          </div>
        )}

        {/* Step 5: Room Types */}
        {step === 'rooms' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-navy">Room Types</h2>
              <button type="button" onClick={addRoom} className="text-xs px-3 py-1 bg-sand rounded-lg text-navy hover:bg-gold/20">+ Add Room Type</button>
            </div>
            <p className="text-xs text-navy/50">Define each room category with pricing. Room photos can be included in the property gallery.</p>
            {rooms.map((room, idx) => (
              <div key={idx} className="border border-gold/10 rounded-xl p-4 space-y-3 bg-sand/30">
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-navy/50">Room Type {idx + 1}</span>
                  {rooms.length > 1 && (
                    <button type="button" onClick={() => removeRoom(idx)} className="text-xs text-red-500">Remove</button>
                  )}
                </div>
                <input value={room.name} onChange={(e) => updateRoom(idx, { name: e.target.value })} placeholder="Room name * (e.g. Deluxe King)" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
                <input value={room.description} onChange={(e) => updateRoom(idx, { description: e.target.value })} placeholder="Room description (optional)" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input value={room.bedType} onChange={(e) => updateRoom(idx, { bedType: e.target.value })} placeholder="Bed type" className="px-3 py-2 border rounded-lg text-sm bg-white" />
                  <input type="number" min={1} max={20} value={room.maxOccupancy} onChange={(e) => updateRoom(idx, { maxOccupancy: Number(e.target.value) })} placeholder="Max guests" className="px-3 py-2 border rounded-lg text-sm bg-white" />
                  <input type="number" min={1} value={room.basePrice} onChange={(e) => updateRoom(idx, { basePrice: Number(e.target.value) })} placeholder="Price/night (USD)" className="px-3 py-2 border rounded-lg text-sm bg-white" />
                  <input type="number" min={1} value={room.roomCount} onChange={(e) => updateRoom(idx, { roomCount: Number(e.target.value) })} placeholder="# of rooms" className="px-3 py-2 border rounded-lg text-sm bg-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 6: Photos */}
        {step === 'photos' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-navy">Property & Facility Photos</h2>
            <p className="text-xs text-navy/50">
              Upload photos of your property — exterior, lobby, rooms, pool, restaurant, spa, and other facilities.
              Include at least one photo. More photos help guests book faster.
            </p>
            <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-gold/30 rounded-xl cursor-pointer hover:border-coral/50">
              <span className="text-3xl">📷</span>
              <span className="text-sm text-navy/60 mt-2">Click to upload photos</span>
              <span className="text-xs text-navy/40">JPG, PNG, WebP — multiple files OK</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setPhotoFiles(Array.from(e.target.files));
                }}
              />
            </label>
            {photoFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoFiles.map((f, i) => (
                  <div key={i} className="text-xs bg-sand px-3 py-2 rounded-lg text-navy/70">
                    📷 {f.name}
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-navy/60">{photoFiles.length} photo(s) selected</p>
          </div>
        )}

        {/* Step 7: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-navy">Review & Submit for Approval</h2>
            <p className="text-xs text-navy/50">Confirm everything below before submitting to E Stays admin for approval.</p>
            <div className="bg-sand rounded-xl p-4 space-y-2 text-sm">
              <p><span className="text-navy/50">Listed as:</span> <strong className="text-navy">{brandedName}</strong></p>
              <p><span className="text-navy/50">Type:</span> {PROPERTY_TYPES.find((t) => t.value === propertyType)?.label} · {starRating}★</p>
              <p><span className="text-navy/50">Location:</span> {address}, {city}{state ? `, ${state}` : ''}, {country}</p>
              <p><span className="text-navy/50">Phone:</span> {phone}</p>
              <p><span className="text-navy/50">Facilities:</span> {selectedAmenities.length} selected</p>
              <p><span className="text-navy/50">Room types:</span> {rooms.length} ({rooms.reduce((s, r) => s + r.roomCount, 0)} total rooms)</p>
              <p><span className="text-navy/50">Photos:</span> {photoFiles.length} uploaded</p>
            </div>
            <p className="text-xs text-gold">After submission, an E Stays admin will review and approve your listing.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gold/10">
          <button type="button" onClick={step === 'basics' ? onCancel : goBack} className="px-4 py-2 text-sm text-navy/60 hover:text-navy">
            {step === 'basics' ? 'Cancel' : '← Back'}
          </button>
          {step === 'review' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-coral text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : `Submit "${brandedName}" for Approval`}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="px-6 py-2.5 bg-navy text-white rounded-lg text-sm font-medium">
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
