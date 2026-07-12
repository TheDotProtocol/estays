const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

function networkErrorResponse<T>(): ApiResponse<T> {
  return {
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message:
        'Unable to reach E Stays servers. Make sure the API is running and NEXT_PUBLIC_API_URL is correct.',
    },
  };
}

async function parseJsonResponse<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return await res.json();
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Received an invalid response from the server.',
      },
    };
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: unknown) {
  localStorage.setItem('user', JSON.stringify(user));
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refresh = localStorage.getItem('refreshToken');
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const data = await parseJsonResponse<{ tokens: { accessToken: string; refreshToken: string } }>(res);
    if (data.success && data.data?.tokens) {
      setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      return true;
    }
  } catch {
    // Network or parse failure — caller will surface a friendly error.
  }
  return false;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await parseJsonResponse<T>(res);

    if (allowRefresh && res.status === 401 && data.error?.code === 'INVALID_TOKEN') {
      const refreshed = await refreshAccessToken();
      if (refreshed) return api<T>(path, options, false);
    }

    return data;
  } catch {
    return networkErrorResponse<T>();
  }
}

export async function login(email: string, password: string) {
  const res = await api<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }
  );
  if (res.success && res.data) {
    setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    setStoredUser(res.data.user);
  }
  return res;
}

export async function searchHotels(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return api<unknown[]>(`/hotels/search?${qs}`);
}

export async function searchLocations(query: string, country?: string) {
  const params = new URLSearchParams({ q: query, limit: '12' });
  if (country) params.set('country', country);
  return api<unknown[]>(`/hotels/locations?${params}`);
}

export async function getCountries() {
  return api<string[]>('/hotels/countries');
}

export async function getAmenities() {
  return api<{ id: string; name: string; icon: string | null; category: string }[]>('/hotels/amenities');
}

export async function createRoomType(hotelId: string, data: Record<string, unknown>) {
  return api(`/hotels/${hotelId}/room-types`, { method: 'POST', body: JSON.stringify(data) });
}

export async function createRoom(hotelId: string, data: Record<string, unknown>) {
  return api(`/hotels/${hotelId}/rooms`, { method: 'POST', body: JSON.stringify(data) });
}

function formatApiError(res: { error?: { message?: string; details?: { fieldErrors?: Record<string, string[]> } } }) {
  const fields = res.error?.details?.fieldErrors as Record<string, string[]> | undefined;
  if (fields && Object.keys(fields).length) {
    return Object.entries(fields)
      .map(([k, v]) => `${k}: ${v.join(', ')}`)
      .join(' · ');
  }
  return res.error?.message || 'Something went wrong';
}

export { formatApiError };

export async function sendOtp(email: string, purpose: 'GUEST_REGISTER' | 'PARTNER_REGISTER') {
  return api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, purpose }) });
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  otpCode: string;
}) {
  const res = await api<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify(data) }
  );
  if (res.success && res.data) {
    setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    setStoredUser(res.data.user);
  }
  return res;
}

export async function registerPartner(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  companyAddress: string;
  otpCode: string;
}) {
  const res = await api<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
    '/auth/register-partner',
    { method: 'POST', body: JSON.stringify(data) }
  );
  if (res.success && res.data) {
    setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    setStoredUser(res.data.user);
  }
  return res;
}

export async function getLoyaltyProfile() {
  return api('/loyalty/me');
}

export async function getHotelBookings(hotelId: string, page = 1) {
  return api(`/bookings/hotel/${hotelId}?page=${page}&limit=20`);
}

export async function getPartnerDashboard(hotelId: string) {
  return api(`/partner/hotels/${hotelId}/dashboard`);
}

export async function updateHotelProfile(hotelId: string, data: Record<string, unknown>) {
  return api(`/hotels/${hotelId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function replyToReview(hotelId: string, reviewId: string, reply: string) {
  return api(`/partner/hotels/${hotelId}/reviews/${reviewId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply }),
  });
}

export async function updateReviewStatus(hotelId: string, reviewId: string, status: string) {
  return api(`/partner/hotels/${hotelId}/reviews/${reviewId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getHotel(id: string) {
  return api(`/hotels/${id}`);
}

export async function createHotel(data: Record<string, unknown>) {
  return api('/hotels', { method: 'POST', body: JSON.stringify(data) });
}

export async function onboardProperty(data: Record<string, unknown>) {
  return api<{ hotel: { id: string; name: string }; roomTypes: unknown[] }>(
    '/partner/properties/onboard',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

async function uploadWithAuth(path: string, formData: FormData, allowRefresh = true): Promise<ApiResponse> {
  const token = getToken();

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await parseJsonResponse(res);

    if (allowRefresh && res.status === 401 && data.error?.code === 'INVALID_TOKEN') {
      const refreshed = await refreshAccessToken();
      if (refreshed) return uploadWithAuth(path, formData, false);
    }

    return data;
  } catch {
    return networkErrorResponse();
  }
}

export async function uploadHotelImages(hotelId: string, files: FileList, isPrimary = false) {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('images', f));
  if (isPrimary) formData.append('isPrimary', 'true');
  return uploadWithAuth(`/uploads/hotel/${hotelId}/images`, formData);
}

export async function getAdminDashboard() {
  return api('/admin/dashboard');
}

export async function getAdminUsers(page = 1) {
  return api(`/admin/users?page=${page}&limit=50`);
}

export async function getAdminPartners() {
  return api('/admin/partners');
}

export async function getAdminTransactions(page = 1) {
  return api(`/admin/transactions?page=${page}&limit=50`);
}

export async function getAdminPerformance() {
  return api('/admin/performance');
}

export async function getAdminProfitLoss() {
  return api('/admin/profit-loss');
}

export async function getAdminComplaints() {
  return api('/admin/complaints');
}

export async function getAdminFeedback() {
  return api('/admin/feedback');
}

export async function updateComplaintStatus(complaintId: string, status: string, resolution?: string) {
  return api(`/admin/complaints/${complaintId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolution }),
  });
}

export async function getPendingHotels() {
  return api('/admin/hotels/pending');
}

export async function approveHotel(id: string, status: string, reason?: string) {
  return api(`/admin/hotels/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejectionReason: reason }),
  });
}

export async function getPartnerHotels() {
  return api('/hotels');
}

export async function getHotelAvailability(hotelId: string, checkIn: string, checkOut: string) {
  return api(`/hotels/${hotelId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`);
}

export async function updatePrices(hotelId: string, ratePlanId: string, prices: { date: string; price: number }[]) {
  return api(`/hotels/${hotelId}/rate-plans/${ratePlanId}/prices`, {
    method: 'PUT',
    body: JSON.stringify({ prices }),
  });
}

export async function createBooking(data: Record<string, unknown>) {
  return api('/bookings', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMyBookings() {
  return api('/bookings/my');
}

export async function getBooking(id: string) {
  return api(`/bookings/${id}`);
}

export async function cancelBooking(id: string, reason: string) {
  return api(`/bookings/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getPaymentMethods() {
  return api('/payments/methods');
}

export async function initiatePayment(
  bookingId: string,
  method: string,
  currency: string,
  payer: { payerName: string; payerEmail: string; payerPhone?: string }
) {
  return api('/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ bookingId, method, currency, ...payer }),
  });
}

export async function confirmPayment(paymentId: string) {
  return api(`/payments/${paymentId}/confirm`, { method: 'POST' });
}

export async function getNotifications() {
  return api('/notifications?limit=20');
}

export async function refundPayment(paymentId: string, amount?: number) {
  return api(`/admin/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify(amount != null ? { amount } : {}),
  });
}

export async function submitComplaint(hotelId: string, data: Record<string, unknown>) {
  return api(`/hotels/${hotelId}/complaints`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPendingPartners() {
  return api('/admin/partners/pending');
}

export async function updatePartnerStatus(userId: string, status: 'APPROVED' | 'REJECTED') {
  return api(`/admin/partners/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getMyKycDocuments() {
  return api('/uploads/partner/kyc');
}

export async function uploadKycDocuments(files: FileList, documentType = 'ID_PROOF') {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('documents', f));
  formData.append('documentType', documentType);
  return uploadWithAuth('/uploads/partner/kyc', formData);
}
