'use client';

import { formatAgodaInr, formatAgodaInrTotal } from '@/lib/agoda-price';

type Props = {
  amountUsd: number;
  nights?: number;
  size?: 'sm' | 'md' | 'lg';
  showTotal?: boolean;
};

export function AgodaInrPrice({ amountUsd, nights = 1, size = 'md', showTotal = false }: Props) {
  const { formatted, wasFormatted, perNight } = formatAgodaInr(amountUsd);

  const sizeClasses = {
    sm: { main: 'text-base', sub: 'text-[10px]' },
    md: { main: 'text-lg', sub: 'text-xs' },
    lg: { main: 'text-2xl', sub: 'text-sm' },
  }[size];

  return (
    <div className="text-right">
      {wasFormatted && (
        <div className={`${sizeClasses.sub} text-ink-subtle line-through`}>{wasFormatted}</div>
      )}
      <div className={`${sizeClasses.main} font-semibold text-ink leading-tight`}>
        {formatted}
        <span className={`${sizeClasses.sub} font-normal text-ink-muted ml-1`}>/ night</span>
      </div>
      <div className={`${sizeClasses.sub} text-ink-muted`}>Incl. taxes & fees</div>
      {showTotal && nights > 1 && (
        <div className={`${sizeClasses.sub} text-ink-muted mt-0.5`}>
          {formatAgodaInrTotal(perNight, nights)} · {nights} nights
        </div>
      )}
    </div>
  );
}
