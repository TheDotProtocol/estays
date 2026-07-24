const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchFeaturedHotels(currency = 'INR', limit = 50) {
  try {
    const res = await fetch(
      `${API_URL}/hotels/featured?currency=${currency}&limit=${limit}`,
      { next: { revalidate: 120 } }
    );
    const data = await res.json();
    return (data.success ? data.data : []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}
