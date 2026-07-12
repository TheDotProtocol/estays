'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getPartnerHotels } from '@/lib/api';
import { PartnerNav } from '@/components/PartnerNav';
import { getHotelAnalytics } from '@/lib/analytics-api';
import { useCurrency } from '@/lib/currency';
import type { RevenueMetrics } from '@estays/shared';

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function PartnerAnalyticsPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [hotels, setHotels] = useState<Record<string, unknown>[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [range, setRange] = useState(defaultRange);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (id: string) => {
    const res = await getHotelAnalytics(id, range.startDate, range.endDate);
    if (res.success) setMetrics(res.data as RevenueMetrics);
  };

  useEffect(() => {
    const user = getStoredUser() as { roles?: string[] } | null;
    if (!user?.roles?.some((r) => ['PARTNER', 'RECEPTIONIST', 'SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/login');
      return;
    }
    getPartnerHotels().then((res) => {
      if (res.success && res.data) {
        const list = res.data as Record<string, unknown>[];
        setHotels(list);
        if (list[0]) {
          setHotelId(list[0].id as string);
          load(list[0].id as string);
        }
      }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (hotelId) load(hotelId);
  }, [hotelId, range]);

  if (loading) return <div className="text-center py-20 text-navy/50">Loading analytics...</div>;

  const maxRevenue = Math.max(...(metrics?.breakdown?.map((b) => b.revenue) || [1]), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PartnerNav />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Analytics</h1>
          <p className="text-sm text-navy/50">Occupancy, ADR, RevPAR & revenue trends</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {hotels.length > 1 && (
            <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {hotels.map((h) => (
                <option key={h.id as string} value={h.id as string}>{h.name as string}</option>
              ))}
            </select>
          )}
          <input type="date" value={range.startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
            className="border rounded-lg px-2 py-1.5 text-sm" />
          <span className="text-navy/40">to</span>
          <input type="date" value={range.endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
            className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
      </div>

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Revenue', value: format(metrics.totalRevenue) },
              { label: 'Bookings', value: metrics.bookingCount },
              { label: 'Occupancy', value: `${metrics.occupancyRate}%` },
              { label: 'ADR', value: format(metrics.averageDailyRate) },
              { label: 'RevPAR', value: format(metrics.revpar) },
            ].map((s) => (
              <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-xs text-navy/50">{s.label}</p>
                <p className="text-xl font-bold text-navy mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-navy mb-4">Daily Revenue</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {metrics.breakdown.map((row) => (
                <div key={row.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-navy/50 text-xs">{row.date}</span>
                  <div className="flex-1 bg-sand rounded-full h-5 overflow-hidden">
                    <div className="bg-coral h-full rounded-full transition-all"
                      style={{ width: `${Math.max(2, (row.revenue / maxRevenue) * 100)}%` }} />
                  </div>
                  <span className="w-20 text-right font-medium text-navy">{format(row.revenue)}</span>
                  <span className="w-14 text-right text-navy/40 text-xs">{row.occupancy}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
