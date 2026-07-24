'use client';

import { useEffect, useRef, useState } from 'react';
import { searchLocations } from '@/lib/api';

interface Destination {
  city: string;
  state: string;
  country: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (display: string, search: { city: string; country?: string }) => void;
  placeholder?: string;
}

export function DestinationAutocomplete({ value, onChange, placeholder = 'City or destination' }: Props) {
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = async (q: string) => {
    setLoading(true);
    const res = await searchLocations(q);
    if (res.success) {
      setSuggestions((res.data as Destination[]) || []);
      setOpen(true);
    }
    setLoading(false);
  };

  const handleInput = (text: string) => {
    onChange(text, { city: text });
    if (text.length >= 1) fetchSuggestions(text);
    else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const select = (dest: Destination) => {
    onChange(dest.label, { city: dest.city, country: dest.country });
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => value.length >= 1 && fetchSuggestions(value)}
        autoComplete="off"
        className="input-field"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-surface-border rounded-xl shadow-card max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={`${s.city}-${s.state}`}>
              <button
                type="button"
                onClick={() => select(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-surface-muted transition text-sm"
              >
                <span className="font-medium text-ink">{s.city}</span>
                <span className="text-ink-muted">, {s.state}, {s.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && (
        <span className="absolute right-3 top-3 text-xs text-ink-subtle">…</span>
      )}
    </div>
  );
}
