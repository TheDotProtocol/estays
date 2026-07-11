'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getPartnerHotels, getHotelBookings } from '@/lib/api';
import { useCurrency } from '@/lib/currency';

export default function PartnerBookingsPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [hotels, setHotels] = useState<Record<string, unknown>[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.roles?.some((r: string) => ['PARTNER', 'RECEPTIONIST', 'SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/login');
      return;
    }
    getPartnerHotels().then((res) => {
      const list = (res.data as Record<string, unknown>[]) || [];
      setHotels(list);
      if (list.length > 0) {
        setSelectedHotelId(list[0].id as string);
        loadBookings(list[0].id as string);
      }
      setLoading(false);
    });
  }, [router]);

  const loadBookings = async (hotelId: string) => {
    setSelectedHotelId(hotelId);
    const res = await getHotelBookings(hotelId);
    setBookings((res.data as Record<string, unknown>[]) || []);
  };

  if (loading) return <div className="text-center py-20 text-navy/50">Loading bookings...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-navy mb-2">Bookings</h1>
      <p className="text-gold text-sm mb-8">Manage reservations across your properties</p>

      {hotels.length > 1 && (
        <select
          value={selectedHotelId}
          onChange={(e) => loadBookings(e.target.value)}
          className="mb-6 px-4 py-2 border border-gold/20 rounded-lg text-sm text-navy"
        >
          {hotels.map((h) => (
            <option key={h.id as string} value={h.id as string}>{h.name as string}</option>
          ))}
        </select>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gold/10">
          <p className="text-navy/50">No bookings yet for this property.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const guest = b.guest as Record<string, unknown>;
            const status = b.status as string;
            return (
              <div key={b.id as string} className="bg-white rounded-xl p-5 border border-gold/10 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-navy">{b.bookingNumber as string}</p>
                  <p className="text-sm text-navy/60">
                    {guest?.firstName as string} {guest?.lastName as string} · {guest?.email as string}
                  </p>
                  <p className="text-sm text-navy/50 mt-1">
                    {String(b.checkInDate).slice(0, 10)} → {String(b.checkOutDate).slice(0, 10)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                    status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{status}</span>
                  <p className="text-lg font-bold text-navy mt-1">{format(Number(b.totalAmount))}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
