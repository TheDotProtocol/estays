'use client';

import { useState } from 'react';
import { AgodaInrPrice } from '@/components/AgodaInrPrice';
import { RoomGalleryModal } from '@/components/RoomGalleryModal';
import { thumbnailImageUrl } from '@/lib/images';
import { buildRoomFeatureTags } from '@/lib/room-images';

export interface RoomOptionData {
  id: string;
  name: string;
  description?: string | null;
  maxOccupancy: number;
  bedType?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[] | null;
  features?: string[] | null;
  nightlyUsd: number;
  nights: number;
  available: boolean;
  ratePlanId?: string | null;
  roomsAvailable?: number;
}

interface RoomOptionCardProps {
  room: RoomOptionData;
  images: string[];
  bookingLoading: boolean;
  onReserve: (ratePlanId: string) => void;
}

export function RoomOptionCard({ room, images, bookingLoading, onReserve }: RoomOptionCardProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const photos = images.length ? images : room.imageUrl ? [room.imageUrl] : [];
  const cover = photos[0] ? thumbnailImageUrl(photos[0]) : null;
  const tags = buildRoomFeatureTags({
    bedType: room.bedType,
    features: room.features,
    description: room.description,
    maxOccupancy: room.maxOccupancy,
  });

  return (
    <>
      <article className="border border-surface-border rounded-2xl overflow-hidden bg-white shadow-card">
        <div className="flex flex-col md:flex-row">
          <button
            type="button"
            onClick={() => photos.length && setGalleryOpen(true)}
            className="relative md:w-56 lg:w-64 shrink-0 aspect-[4/3] md:aspect-auto md:min-h-[180px] bg-surface-muted text-left group"
            aria-label={`View photos of ${room.name}`}
          >
            {cover ? (
              <img src={cover} alt={room.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-muted text-sm">No photo</div>
            )}
            {photos.length > 1 && (
              <span className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-[11px] font-medium">
                {photos.length} photos
              </span>
            )}
            {photos.length > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
                <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-ink text-xs font-semibold px-3 py-1.5 rounded-full shadow">
                  View gallery
                </span>
              </span>
            )}
          </button>

          <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-ink text-lg">{room.name}</h3>
              <p className="text-xs text-ink-muted mt-1">
                {room.nights} night{room.nights > 1 ? 's' : ''} · {room.maxOccupancy} adults
                {room.roomsAvailable != null && room.available ? ` · ${room.roomsAvailable} left` : ''}
              </p>
              {room.description && (
                <p className="text-sm text-ink-muted mt-2 line-clamp-2">{room.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-1 rounded-md bg-surface-muted text-ink-muted border border-surface-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="text-sm text-brand font-medium mt-3 hover:underline underline-offset-2"
                >
                  See photos & details
                </button>
              )}
            </div>

            <div className="sm:w-40 shrink-0 flex sm:flex-col items-end justify-between gap-3 border-t sm:border-t-0 sm:border-l border-surface-border pt-3 sm:pt-0 sm:pl-4">
              {room.available && room.ratePlanId ? (
                <>
                  <AgodaInrPrice amountUsd={room.nightlyUsd} nights={room.nights} size="md" showTotal />
                  <button
                    type="button"
                    onClick={() => onReserve(room.ratePlanId!)}
                    disabled={bookingLoading}
                    className="w-full sm:w-auto px-5 py-2.5 btn-primary text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {bookingLoading ? 'Booking…' : 'Reserve'}
                  </button>
                </>
              ) : (
                <span className="text-sm text-ink-muted font-medium">Sold out</span>
              )}
            </div>
          </div>
        </div>
      </article>

      <RoomGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={photos}
        roomName={room.name}
      />
    </>
  );
}
