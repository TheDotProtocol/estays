import { getToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function getDailyOps(hotelId: string, date?: string) {
  const params = date ? `?date=${date}` : '';
  const res = await fetch(`${API_URL}/pms/hotels/${hotelId}/daily-ops${params}`, { headers: authHeaders() });
  return res.json();
}

export async function getRoomBoard(hotelId: string) {
  const res = await fetch(`${API_URL}/pms/hotels/${hotelId}/room-board`, { headers: authHeaders() });
  return res.json();
}

export async function checkInGuest(hotelId: string, bookingId: string, roomId: string) {
  const res = await fetch(`${API_URL}/pms/hotels/${hotelId}/check-in`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ bookingId, roomId }),
  });
  return res.json();
}

export async function checkOutGuest(hotelId: string, bookingId: string) {
  const res = await fetch(`${API_URL}/pms/hotels/${hotelId}/check-out`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ bookingId }),
  });
  return res.json();
}

export async function addFolioItem(
  hotelId: string,
  bookingId: string,
  item: { type: string; description: string; quantity: number; unitPrice: number }
) {
  const res = await fetch(`${API_URL}/pms/hotels/${hotelId}/bookings/${bookingId}/folio/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function updateRoomStatus(hotelId: string, roomId: string, status: string, notes?: string) {
  const res = await fetch(`${API_URL}/pms/hotels/${hotelId}/rooms/${roomId}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status, notes }),
  });
  return res.json();
}

export async function markRoomClean(hotelId: string, roomId: string) {
  const res = await fetch(`${API_URL}/pms/hotels/${hotelId}/rooms/${roomId}/clean`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return res.json();
}
