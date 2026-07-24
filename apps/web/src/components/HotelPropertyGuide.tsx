'use client';

import { useMemo, useState } from 'react';
import type { HotelRichContent } from '@estays/shared';
import { isValidGuestPhotoUrl } from '@estays/shared';
import { ImageCarousel } from '@/components/ImageCarousel';

interface HotelPropertyGuideProps {
  content: HotelRichContent;
  propertyName: string;
}

type TabId = 'about' | 'facilities' | 'location' | 'policies';

const TABS: { id: TabId; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'location', label: 'Location' },
  { id: 'policies', label: 'Policies' },
];

export function HotelPropertyGuide({ content, propertyName }: HotelPropertyGuideProps) {
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const guestPhotos = useMemo(
    () =>
      [...new Set((content.guestPhotoUrls || []).filter(isValidGuestPhotoUrl))].map((url) => ({
        url,
        caption: 'Guest photo',
      })),
    [content.guestPhotoUrls]
  );

  return (
    <section className="mt-10 border border-surface-border rounded-2xl overflow-hidden bg-white shadow-card">
      <div className="px-4 sm:px-6 py-5 border-b border-surface-border bg-surface-muted/40">
        <h2 className="font-semibold text-ink text-lg">Property guide</h2>
        <p className="text-sm text-ink-muted mt-1">{content.tagline}</p>
      </div>

      <div className="flex flex-wrap gap-1 px-4 sm:px-6 pt-4 border-b border-surface-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === tab.id
                ? 'bg-white text-brand border border-surface-border border-b-white -mb-px'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 sm:px-6 py-6">
        {activeTab === 'about' && (
          <div className="space-y-6">
            {content.aboutSections.map((section) => (
              <article key={section.title}>
                <h3 className="font-semibold text-ink mb-2">{section.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{section.body}</p>
              </article>
            ))}
            {content.usefulFacts.length > 0 && (
              <div className="pt-4 border-t border-surface-border">
                <h3 className="font-semibold text-ink mb-3 text-sm">Useful facts</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.usefulFacts.map((fact) => (
                    <div key={fact.label} className="text-sm">
                      <dt className="text-ink-muted">{fact.label}</dt>
                      <dd className="text-ink font-medium">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className="space-y-6">
            {content.facilities.map((group) => (
              <div key={group.category}>
                <h3 className="font-semibold text-ink mb-2 text-sm">{group.category}</h3>
                <ul className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="text-xs bg-surface-muted text-ink-muted px-3 py-1.5 rounded-full border border-surface-border"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              {propertyName} — explore what&apos;s nearby during your stay with E Stays.
            </p>
            <ul className="divide-y divide-surface-border rounded-xl border border-surface-border overflow-hidden">
              {content.locationHighlights.map((spot) => (
                <li key={spot.name} className="flex items-center justify-between px-4 py-3 text-sm bg-white">
                  <span className="text-ink">{spot.name}</span>
                  <span className="text-ink-muted shrink-0 ml-4">{spot.distance}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="space-y-6">
            {content.policies.map((group) => (
              <div key={group.title}>
                <h3 className="font-semibold text-ink mb-2 text-sm">{group.title}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-ink-muted">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {guestPhotos.length > 0 && (
        <div className="px-4 sm:px-6 pb-6 border-t border-surface-border pt-6">
          <h3 className="font-semibold text-ink mb-4">Guest photos</h3>
          <ImageCarousel
            images={guestPhotos}
            alt={`Guest photos at ${propertyName}`}
            aspectClass="aspect-[16/10] min-h-[220px]"
          />
        </div>
      )}
    </section>
  );
}
