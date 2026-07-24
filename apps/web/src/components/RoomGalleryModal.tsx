'use client';

import { useEffect, useState } from 'react';
import { optimizeCdnImageUrl, thumbnailImageUrl } from '@/lib/images';

interface RoomGalleryModalProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  roomName: string;
}

export function RoomGalleryModal({ open, onClose, images, roomName }: RoomGalleryModalProps) {
  const photos = [...new Set(images.filter(Boolean))];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [open, roomName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, photos.length]);

  if (!open || !photos.length) return null;

  const current = optimizeCdnImageUrl(photos[index]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <h3 className="font-semibold text-ink text-sm sm:text-base">{roomName}</h3>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink px-2 py-1 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="relative aspect-[16/10] bg-surface-muted">
          <img src={current} alt={roomName} className="w-full h-full object-contain bg-black" />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-ink shadow"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-ink shadow"
                aria-label="Next"
              >
                ›
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
                {index + 1} / {photos.length}
              </span>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto border-t border-surface-border">
            {photos.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${
                  i === index ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={thumbnailImageUrl(url)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
