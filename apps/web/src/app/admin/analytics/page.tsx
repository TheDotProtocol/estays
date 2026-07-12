'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser } from '@/lib/api';
import { getPlatformAnalytics, downloadAnalyticsCsv } from '@/lib/analytics-api';
import { useCurrency } from '@/lib/currency';
import type { RevenueMetrics } from '@estays/shared';

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [range, setRange] = useState(defaultRange);
  const [platform, setPlatform] = useState<RevenueMetrics | null>(null);
  const [hotels, setHotels] = useState<{ hotel: Record<string, unknown>; metrics: RevenueMetrics }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser() as { roles?: string[] } | null;
    if (!user?.roles?.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/login');
      return;
    }
    getPlatformAnalytics(range.startDate, range.endDate).then((res) => {
      if (res.success && res.data) {
        const d = res.data as { platform: RevenueMetrics; hotels: typeof hotels };
        setPlatform(d.platform);
        setHotels(d.hotels || []);
      }
      setLoading(false);
    });
  }, [router, range]);

  if (loading) return <div className="text-center py-20 text-navy/50">Loading platform analytics...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <Link href="/admin" className="text-sm text-coral hover:underline">← Admin</Link>
          <h1 className="font-display text-2xl font-bold text-navy mt-2">Platform Analytics</h1>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={range.startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
          <span className="text-navy/40">to</span>
          <input type="date" value={range.endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
          <button onClick={() => downloadAnalyticsCsv(null, range.startDate, range.endDate)} className="px-3 py-1.5 bg-navy text-white text-sm rounded-lg">Export CSV</button>
        </div>
      </div>
      {platform && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Revenue', value: format(platform.totalRevenue) },
            { label: 'Bookings', value: platform.bookingCount },
            { label: 'Occupancy', value: `${platform.occupancyRate}%` },
            { label: 'ADR', value: format(platform.averageDailyRate) },
            { label: 'RevPAR', value: format(platform.revpar) },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
              <p className="text-xs text-navy/50">{s.label}</p>
              <p className="text-xl font-bold text-navy">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold text-navy">Per Property</div>
        <table className="w-full text-sm">
          <thead className="bg-sand text-navy/60 text-xs">
            <tr><th className="px-4 py-2 text-left">Hotel</th><th>Revenue</th><th>Occ%</th><th>ADR</th><th>RevPAR</th></tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h.hotel.id as string} className="border-t">
                <td className="px-4 py-3">{h.hotel.name as string} <span className="text-navy/40 text-xs">{h.hotel.city as string}</span></td>
                <td className="text-center">{format(h.metrics.totalRevenue)}</td>
                <td className="text-center">{h.metrics.occupancyRate}%</td>
                <td className="text-center">{format(h.metrics.averageDailyRate)}</td>
                <td className="text-center">{format(h.metrics.revpar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
