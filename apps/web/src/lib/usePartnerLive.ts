'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPartnerDashboard } from '@/lib/api';

export function usePartnerLive(hotelId: string | null) {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hotelId) return;
    const res = await getPartnerDashboard(hotelId);
    if (res.success && res.data) {
      setDashboard(res.data as Record<string, unknown>);
      setLastUpdate((res.data as Record<string, unknown>).lastUpdated as string);
      setConnected(true);
    }
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId) return;
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [hotelId, refresh]);

  return { dashboard, connected, lastUpdate, refresh };
}
