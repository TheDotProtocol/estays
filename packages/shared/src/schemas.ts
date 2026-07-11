import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  otpCode: z.string().length(6, 'Enter the 6-digit verification code'),
});

export const partnerRegisterSchema = registerSchema.extend({
  phone: z.string().min(8, 'Contact number is required'),
  companyName: z.string().min(2, 'Company / property name is required'),
  companyAddress: z.string().min(5, 'Business address is required'),
});

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  purpose: z.enum(['GUEST_REGISTER', 'PARTNER_REGISTER']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Hotels ────────────────────────────────────────────────────────

const emptyToUndefined = (val: unknown) => (val === '' || val === null ? undefined : val);

export const createHotelSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string().min(2),
  postalCode: z.string().optional(),
  phone: z.string().min(5, 'Contact phone is required'),
  email: z.preprocess(emptyToUndefined, z.string().email().optional()),
  website: z.preprocess(emptyToUndefined, z.string().url().optional()),
  googleMapsUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
  googlePlaceId: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  socialFacebook: z.preprocess(emptyToUndefined, z.string().url().optional()),
  socialInstagram: z.preprocess(emptyToUndefined, z.string().url().optional()),
  socialTwitter: z.preprocess(emptyToUndefined, z.string().url().optional()),
  socialLinkedIn: z.preprocess(emptyToUndefined, z.string().url().optional()),
  socialYoutube: z.preprocess(emptyToUndefined, z.string().url().optional()),
  propertyType: z
    .enum(['HOTEL', 'RESORT', 'SERVICE_APARTMENT', 'HOUSE', 'VILLA', 'BOUTIQUE', 'HOMESTAY'])
    .default('HOTEL'),
  starRating: z.number().int().min(1).max(5).default(3),
  checkInTime: z.string().default('15:00'),
  checkOutTime: z.string().default('11:00'),
  amenityIds: z.array(z.string()).optional(),
  brandAccepted: z.boolean().optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

export const hotelSearchSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).default(0),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  starRating: z.coerce.number().int().min(1).max(5).optional(),
  propertyType: z.enum(['HOTEL', 'RESORT', 'SERVICE_APARTMENT', 'HOUSE', 'VILLA', 'BOUTIQUE', 'HOMESTAY']).optional(),
  currency: z.string().length(3).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const approveHotelSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE']),
  rejectionReason: z.string().optional(),
});

// ─── Rooms ─────────────────────────────────────────────────────────

export const createRoomTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  maxOccupancy: z.number().int().min(1).max(20).default(2),
  bedType: z.string().optional(),
  sizeSqm: z.number().positive().optional(),
  basePrice: z.number().positive(),
});

export const onboardRoomTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  maxOccupancy: z.number().int().min(1).max(20).default(2),
  bedType: z.string().optional(),
  basePrice: z.number().positive(),
  roomCount: z.number().int().min(1).max(50).default(1),
});

/** Single-request partner property onboarding (hotel + amenities + room types + rooms). */
export const onboardPropertySchema = createHotelSchema.extend({
  brandAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the E Stays branding before listing your property' }),
  }),
  amenityIds: z.array(z.string()).min(1, 'Select at least one facility'),
  roomTypes: z.array(onboardRoomTypeSchema).min(1, 'Add at least one room type'),
});

export const createRoomSchema = z.object({
  roomTypeId: z.string(),
  roomNumber: z.string().min(1),
  floor: z.number().int().optional(),
  notes: z.string().optional(),
});

export const updateRoomStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'DIRTY', 'MAINTENANCE', 'BLOCKED']),
  notes: z.string().optional(),
});

// ─── Pricing ───────────────────────────────────────────────────────

export const createRatePlanSchema = z.object({
  roomTypeId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  isRefundable: z.boolean().default(true),
  cancellationHours: z.number().int().min(0).default(24),
});

export const updatePricesSchema = z.object({
  prices: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      price: z.number().positive(),
      minStay: z.number().int().min(1).optional(),
      isClosed: z.boolean().optional(),
    })
  ),
});

// ─── Bookings ──────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  hotelId: z.string(),
  ratePlanId: z.string(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  specialRequests: z.string().optional(),
  guests: z
    .array(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

// ─── PMS ───────────────────────────────────────────────────────────

export const checkInSchema = z.object({
  bookingId: z.string(),
  roomId: z.string(),
});

export const checkOutSchema = z.object({
  bookingId: z.string(),
});

export const addFolioItemSchema = z.object({
  type: z.enum([
    'ROOM_CHARGE',
    'TAX',
    'SERVICE',
    'MINIBAR',
    'RESTAURANT',
    'LAUNDRY',
    'PARKING',
    'OTHER',
    'DISCOUNT',
    'REFUND',
  ]),
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number(),
});

// ─── Payments ──────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  bookingId: z.string(),
  method: z.enum(['UPI', 'ALIPAY', 'THAI_QR', 'PAY_AT_HOTEL', 'STRIPE', 'CREDIT_CARD', 'OTHER']).default('UPI'),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  payerName: z.string().min(2, 'Full name is required'),
  payerEmail: z.string().email('Valid email required for refunds'),
  payerPhone: z.string().optional(),
});

// ─── Pagination ────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Analytics ─────────────────────────────────────────────────────

export const analyticsQuerySchema = z.object({
  hotelId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

export const reviewReplySchema = z.object({
  reply: z.string().min(1).max(2000),
});

export const reviewStatusSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN', 'PENDING']),
});

// ─── Finance & Settlement ──────────────────────────────────────────

export const commissionRuleSchema = z.object({
  hotelId: z.string().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(['FLAT', 'PERCENTAGE', 'PROMOTIONAL', 'ZERO']),
  flatAmount: z.number().nonnegative().optional(),
  percentageRate: z.number().min(0).max(1).optional(),
  promotionalRate: z.number().min(0).max(1).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});

export const settlementAdjustmentSchema = z.object({
  hotelId: z.string(),
  entryType: z.enum(['MANUAL_CREDIT', 'MANUAL_DEBIT', 'ADJUSTMENT']),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
});

export const settlementSearchSchema = z.object({
  hotelId: z.string().optional(),
  partnerId: z.string().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'PROCESSING', 'SETTLED', 'COMPLETED', 'FAILED', 'REVERSED']).optional(),
  settlementId: z.string().optional(),
  bookingId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const billingConfigSchema = z.object({
  settlementNotifyEmails: z.array(z.string().email()).min(1),
  billingFromEmail: z.string().email(),
  billingReplyToEmail: z.string().email().optional(),
  companyLegalName: z.string().min(1).max(200),
});

export const partnerBankAccountSchema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(4),
  ifscCode: z.string().optional(),
  swiftCode: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>;
export type SettlementAdjustmentInput = z.infer<typeof settlementAdjustmentSchema>;
export type SettlementSearchInput = z.infer<typeof settlementSearchSchema>;
export type BillingConfigInput = z.infer<typeof billingConfigSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateHotelInput = z.infer<typeof createHotelSchema>;
export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type OnboardPropertyInput = z.infer<typeof onboardPropertySchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
