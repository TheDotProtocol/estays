export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  hotelIds?: string[];
  loyaltyPoints?: number;
  loyaltyTier?: string;
  lifetimeBookings?: number;
  emailVerified?: boolean;
  partnerStatus?: string;
  phone?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  hotelIds?: string[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AvailabilityResult {
  hotelId: string;
  roomTypeId: string;
  ratePlanId: string;
  available: boolean;
  totalPrice: number;
  nightlyBreakdown: { date: string; price: number }[];
  roomsAvailable: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  bookingCount: number;
  averageDailyRate: number;
  occupancyRate: number;
  revpar: number;
  period: { start: string; end: string };
  breakdown: { date: string; revenue: number; bookings: number; occupancy: number }[];
}

export interface DashboardStats {
  totalHotels: number;
  activeHotels: number;
  pendingApprovals: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
}

export * from './constants';
export * from './schemas';
export * from './currency';
export * from './locations';
export * from './loyalty';
export * from './branding';
export * from './countries';
export * from './finance';
export * from './company';
export * from './tax';
