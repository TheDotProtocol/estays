export interface Hotel {
  id: string;
  name: string;
  location: string | null;
  image_count: number;
}

export interface ImageItem {
  id: string;
  hotel_id: string;
  hotel_name: string;
  source: string;
  page_url: string;
  image_url: string;
  local_path: string | null;
  organized_path: string | null;
  primary_category: string;
  room_type: string | null;
  facility_type: string | null;
  caption: string | null;
  alt_text: string | null;
  confidence: number;
  hash: string | null;
  download_date: string | null;
  license_note: string | null;
}

const API = import.meta.env.VITE_API_URL || '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  hotels: () => fetchJson<Hotel[]>('/hotels'),
  hotel: (id: string) => fetchJson<Hotel>(`/hotel/${id}`),
  rooms: (id: string) => fetchJson<ImageItem[]>(`/hotel/${id}/rooms`),
  facilities: (id: string) => fetchJson<ImageItem[]>(`/hotel/${id}/facilities`),
  images: (id: string, minConfidence = 0) =>
    fetchJson<ImageItem[]>(`/hotel/${id}/images?min_confidence=${minConfidence}`),
  search: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return fetchJson<ImageItem[]>(`/search?${q}`);
  },
  imageUrl: (id: string) => `${API}/images/${id}/file`,
  exportMetadata: (hotelId?: string) =>
    fetchJson<Record<string, unknown>[]>(`/metadata/export${hotelId ? `?hotel_id=${hotelId}` : ''}`),
};
