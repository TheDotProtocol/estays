'use client';

import { useCallback, useEffect, useState } from 'react';
import { optimizeCdnImageUrl, thumbnailImageUrl } from '@/lib/images';

type CarouselImage = { url: string; caption?: string | null };

interface ImageCarouselProps {
  images: CarouselImage[];
  alt: string;
  className?: string;
  aspectClass?: string;
}

export function ImageCarousel({
  images,
  alt,
  className = '',
  aspectClass = 'aspect-[16/10] min-h-[240px]',
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  const go = useCallback(
    (delta: number) => {
      if (total <= 1) return;
      setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  useEffect(() => {
    setIndex(0);
  }, [images]);

  if (!total) {
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-surface-muted ${aspectClass} ${className}`}>
        <div className="h-full flex items-center justify-center text-ink-muted">No photo</div>
      </div>
    );
  }

  const current = images[index];
  const heroUrl = optimizeCdnImageUrl(current.url);

  return (
    <div className={`relative group ${className}`}>
      <div className={`relative rounded-2xl overflow-hidden bg-surface-muted ${aspectClass}`}>
        <img
          src={heroUrl}
          alt={current.caption || alt}
          className="w-full h-full object-cover"
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'auto'}
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow text-ink hover:bg-white opacity-0 group-hover:opacity-100 transition"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow text-ink hover:bg-white opacity-0 group-hover:opacity-100 transition"
              aria-label="Next photo"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs">
              {index + 1} / {total}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition ${
                i === index ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`View photo ${i + 1}`}
            >
              <img src={thumbnailImageUrl(img.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
