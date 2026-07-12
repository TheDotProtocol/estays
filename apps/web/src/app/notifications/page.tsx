'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getNotifications } from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStoredUser()) { router.push('/login'); return; }
    getNotifications().then((res) => {
      if (res.success) setItems((res.data as Record<string, unknown>[]) || []);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="text-center py-20 text-navy/50">Loading notifications...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-navy mb-6">Notifications</h1>
      {items.length === 0 ? (
        <p className="text-navy/50 text-center py-12">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id as string} className={`bg-white border rounded-xl p-4 ${n.isRead ? 'opacity-70' : ''}`}>
              <p className="font-medium text-navy">{n.title as string}</p>
              <p className="text-sm text-navy/60 mt-1">{n.message as string}</p>
              <p className="text-xs text-navy/40 mt-2">{new Date(n.createdAt as string).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
