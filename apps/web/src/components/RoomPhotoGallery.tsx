'use client';

import { useState } from 'react';
import { optimizeCdnImageUrl, thumbnailImageUrl } from '@/lib/images';

interface RoomPhotoGalleryProps {
  images: string[];
  alt: string;
}

export function RoomPhotoGallery({ images, alt }: RoomPhotoGalleryProps) {
  const photos = [...new Set(images.filter(Boolean))];
  const [index, setIndex] = useState(0);

  if (!photos.length) return null;

  const current = optimizeCdnImageUrl(photos[index] || photos[0]);

  return (
    <div>
      <div className="relative aspect-[16/9] bg-surface-muted group">
        <img src={current} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-ink shadow opacity-0 group-hover:opacity-100 transition"
              aria-label="Previous room photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-ink shadow opacity-0 group-hover:opacity-100 transition"
              aria-label="Next room photo"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded-full bg-black/50 text-white">
              {index + 1}/{photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
          {photos.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 ${
                i === index ? 'border-ink' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              <img src={thumbnailImageUrl(url)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
