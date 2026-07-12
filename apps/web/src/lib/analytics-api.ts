import { getToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getHotelAnalytics(hotelId: string, startDate: string, endDate: string, groupBy = 'day') {
  const params = new URLSearchParams({ startDate, endDate, groupBy });
  const res = await fetch(`${API_URL}/analytics/hotels/${hotelId}?${params}`, { headers: authHeaders() });
  return res.json();
}

export async function getPlatformAnalytics(startDate: string, endDate: string, groupBy = 'day') {
  const params = new URLSearchParams({ startDate, endDate, groupBy });
  const res = await fetch(`${API_URL}/analytics/platform?${params}`, { headers: authHeaders() });
  return res.json();
}
