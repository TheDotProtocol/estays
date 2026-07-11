'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStoredUser, getMyBookings, cancelBooking } from '@/lib/api';
import { useCurrency } from '@/lib/currency';

export default function MyBookingsPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getMyBookings().then((res) => {
      if (res.success) setBookings((res.data as Record<string, unknown>[]) || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!getStoredUser()) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    await cancelBooking(id, 'Cancelled by guest');
    load();
  };

  if (loading) return <div className="text-center py-20 text-navy/50">Loading bookings...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-navy mb-8">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gold/10">
          <p className="text-navy/50">No bookings yet.</p>
          <Link href="/" className="text-coral hover:underline mt-2 inline-block">Search hotels</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const hotel = b.hotel as Record<string, unknown>;
            const status = b.status as string;
            return (
              <div key={b.id as string} className="bg-white rounded-xl p-6 border border-gold/10 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-navy text-lg">{hotel?.name as string}</h3>
                    <p className="text-sm text-navy/50">{hotel?.city as string}</p>
                    <p className="text-sm text-navy/60 mt-2">
                      {String(b.checkInDate).slice(0, 10)} → {String(b.checkOutDate).slice(0, 10)}
                    </p>
                    <p className="text-xs text-navy/40 mt-1">Ref: {b.bookingNumber as string}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>{status}</span>
                    <div className="text-xl font-bold text-navy mt-2">{format(Number(b.totalAmount))}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {status === 'PENDING' && (
                    <Link
                      href={`/bookings/${b.id}/checkout`}
                      className="px-4 py-2 bg-coral text-white text-sm rounded-lg hover:bg-coral-light transition"
                    >
                      Complete Payment
                    </Link>
                  )}
                  {['PENDING', 'CONFIRMED'].includes(status) && (
                    <button
                      onClick={() => handleCancel(b.id as string)}
                      className="px-4 py-2 border border-navy/20 text-navy text-sm rounded-lg hover:bg-sand transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
