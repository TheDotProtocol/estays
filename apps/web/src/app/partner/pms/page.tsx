'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getPartnerHotels } from '@/lib/api';
import { PartnerNav } from '@/components/PartnerNav';
import {
  getDailyOps,
  getRoomBoard,
  checkInGuest,
  checkOutGuest,
  markRoomClean,
} from '@/lib/pms-api';
import { useCurrency } from '@/lib/currency';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  OCCUPIED: 'bg-blue-100 text-blue-800 border-blue-200',
  DIRTY: 'bg-orange-100 text-orange-800 border-orange-200',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BLOCKED: 'bg-red-100 text-red-700 border-red-200',
};

export default function PartnerPmsPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [hotels, setHotels] = useState<Record<string, unknown>[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [tab, setTab] = useState<'ops' | 'rooms'>('ops');
  const [ops, setOps] = useState<Record<string, unknown> | null>(null);
  const [board, setBoard] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [checkInRoom, setCheckInRoom] = useState<Record<string, string>>({});

  const today = new Date().toISOString().slice(0, 10);

  const load = async (id: string) => {
    const [opsRes, boardRes] = await Promise.all([getDailyOps(id, today), getRoomBoard(id)]);
    if (opsRes.success) setOps(opsRes.data as Record<string, unknown>);
    if (boardRes.success) setBoard(boardRes.data as Record<string, unknown>);
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
  }, [hotelId]);

  const handleCheckIn = async (bookingId: string) => {
    const roomId = checkInRoom[bookingId];
    if (!roomId) { setMsg('Select a room first'); return; }
    const res = await checkInGuest(hotelId, bookingId, roomId);
    setMsg(res.success ? 'Guest checked in' : (res.error?.message || 'Check-in failed'));
    if (res.success) load(hotelId);
  };

  const handleCheckOut = async (bookingId: string) => {
    const res = await checkOutGuest(hotelId, bookingId);
    setMsg(res.success ? 'Guest checked out — room marked dirty' : (res.error?.message || 'Check-out failed'));
    if (res.success) load(hotelId);
  };

  const handleClean = async (roomId: string) => {
    const res = await markRoomClean(hotelId, roomId);
    setMsg(res.success ? 'Room ready' : (res.error?.message || 'Failed'));
    if (res.success) load(hotelId);
  };

  if (loading) return <div className="text-center py-20 text-navy/50">Loading E PMS...</div>;

  const counts = ops?.counts as Record<string, number> | undefined;
  const arrivals = (ops?.arrivals as Record<string, unknown>[]) || [];
  const departures = (ops?.departures as Record<string, unknown>[]) || [];
  const inHouse = (ops?.inHouse as Record<string, unknown>[]) || [];
  const rooms = (board?.rooms as Record<string, unknown>[]) || [];
  const summary = board?.summary as Record<string, number> | undefined;
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PartnerNav />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">E PMS — Front Desk</h1>
          <p className="text-sm text-navy/50">Check-in, check-out, room board & daily operations</p>
        </div>
        {hotels.length > 1 && (
          <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {hotels.map((h) => (
              <option key={h.id as string} value={h.id as string}>{h.name as string}</option>
            ))}
          </select>
        )}
      </div>

      {msg && <p className="mb-4 text-sm px-4 py-2 bg-sand rounded-lg text-navy">{msg}</p>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Arrivals Today', value: counts?.arrivals ?? 0, color: 'text-coral' },
          { label: 'Departures Today', value: counts?.departures ?? 0, color: 'text-blue-600' },
          { label: 'In-House', value: counts?.inHouse ?? 0, color: 'text-navy' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xs text-navy/50">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['ops', 'rooms'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg ${tab === t ? 'bg-navy text-white' : 'bg-sand text-navy'}`}>
            {t === 'ops' ? 'Daily Operations' : `Room Board (${summary?.total ?? 0})`}
          </button>
        ))}
      </div>

      {tab === 'ops' && (
        <div className="space-y-6">
          <OpsSection title="Arrivals — Check In" items={arrivals} empty="No arrivals today">
            {(b) => (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <select
                  value={checkInRoom[b.id as string] || ''}
                  onChange={(e) => setCheckInRoom((p) => ({ ...p, [b.id as string]: e.target.value }))}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="">Assign room...</option>
                  {availableRooms.map((r) => (
                    <option key={r.id as string} value={r.id as string}>
                      {r.roomNumber as string} — {((r.roomType as Record<string, string>)?.name)}
                    </option>
                  ))}
                </select>
                <button onClick={() => handleCheckIn(b.id as string)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg">Check In</button>
              </div>
            )}
          </OpsSection>

          <OpsSection title="Departures — Check Out" items={departures} empty="No departures today">
            {(b) => (
              <button onClick={() => handleCheckOut(b.id as string)}
                className="mt-2 px-3 py-1 bg-navy text-white text-sm rounded-lg">Check Out</button>
            )}
          </OpsSection>

          <OpsSection title="In-House Guests" items={inHouse} empty="No guests in-house">
            {(b) => (
              <p className="text-xs text-navy/50 mt-1">
                Room {b.roomNumber as string} · Folio: {b.folioStatus as string}
                {b.folioTotal ? ` · ${format(b.folioTotal as number)}` : ''}
              </p>
            )}
          </OpsSection>
        </div>
      )}

      {tab === 'rooms' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {rooms.map((r) => (
            <div key={r.id as string} className={`border rounded-xl p-3 ${STATUS_COLORS[r.status as string] || 'bg-white'}`}>
              <p className="font-bold text-lg">{r.roomNumber as string}</p>
              <p className="text-xs opacity-70">{((r.roomType as Record<string, string>)?.name)}</p>
              <p className="text-xs font-medium mt-1">{r.status as string}</p>
              {(r.currentGuest as Record<string, string> | null) && (
                <p className="text-[10px] mt-1 truncate">{(r.currentGuest as Record<string, string>).guestName}</p>
              )}
              {r.status === 'DIRTY' && (
                <button onClick={() => handleClean(r.id as string)}
                  className="mt-2 w-full text-[10px] px-2 py-1 bg-white/80 rounded">Mark Clean</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OpsSection({ title, items, empty, children }: {
  title: string;
  items: Record<string, unknown>[];
  empty: string;
  children: (b: Record<string, unknown>) => ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b font-semibold text-navy">{title} ({items.length})</div>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-navy/40 text-center">{empty}</p>
      ) : (
        <div className="divide-y">
          {items.map((b) => (
            <div key={b.id as string} className="px-5 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-navy">{b.guestName as string}</p>
                  <p className="text-xs text-navy/50">
                    {b.bookingNumber as string} · {b.roomType as string}
                    {b.roomNumber ? ` · Room ${b.roomNumber}` : ''}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-sand rounded">{b.status as string}</span>
              </div>
              {children(b)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
