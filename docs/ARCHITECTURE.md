# E Stays — Platform Architecture

## Overview

E Stays is a multi-tenant hospitality SaaS platform connecting guests, hotel partners, and platform administrators through a unified property management and booking ecosystem.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         E STAYS PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────┤
│  User Portal          Partner Portal         Admin Portal               │
│  (Guest booking)      (Hotel operations)     (Platform governance)      │
│       │                      │                        │                   │
│       └──────────────────────┼────────────────────────┘                   │
│                              ▼                                          │
│                    Next.js 15 Web App (apps/web)                        │
│                              │                                          │
│                              ▼ REST + JWT                               │
│                    Express API (apps/api)                               │
│         ┌────────────────────┼────────────────────┐                       │
│         ▼                    ▼                    ▼                       │
│   Auth & RBAC         Service Layer         Repositories                  │
│         │                    │                    │                       │
│         └────────────────────┼────────────────────┘                       │
│                              ▼                                          │
│              Prisma ORM (packages/database)                             │
│                              │                                          │
│         ┌────────────────────┼────────────────────┐                       │
│         ▼                    ▼                    ▼                       │
│   PostgreSQL            Redis (cache)      Local/S3 Storage               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + npm workspaces |
| API | Express 4 + TypeScript |
| Web | Next.js 15 (App Router) + Tailwind CSS |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh tokens), bcrypt |
| Validation | Zod |
| Logging | Pino (structured JSON logs) |
| Payments | Stripe (test mode) + internal ledger |
| Notifications | In-app + email (Nodemailer) |
| File Uploads | Multer + local storage (S3-ready interface) |
| Deployment | Vercel (web) + Render (API + Postgres). See [DEPLOYMENT.md](./DEPLOYMENT.md) |

## Domain Modules

### 1. Identity & Access (IAM)
- Users with email/password authentication
- Roles: `SUPER_ADMIN`, `ADMIN`, `PARTNER`, `RECEPTIONIST`, `GUEST`
- Permission-based RBAC enforced at middleware + service layer
- Hotel-scoped access for partner/receptionist roles

### 2. Hotel Management
- Hotel onboarding with approval workflow (`PENDING` → `APPROVED` → `ACTIVE`)
- Room types, physical rooms, amenities
- Rate plans with nightly pricing and seasonal overrides
- Media uploads (images)

### 3. Inventory Engine
- Per-room-per-night availability ledger
- Atomic inventory holds during booking
- Automatic release on cancellation/expiry
- Overbooking prevention via DB transactions

### 4. Booking Engine
- Search by dates, guests, location
- Real-time availability check
- Booking lifecycle: `PENDING` → `CONFIRMED` → `CHECKED_IN` → `CHECKED_OUT` → `COMPLETED` / `CANCELLED`
- Modification and cancellation with policy enforcement

### 5. PMS (Property Management System)
- Front desk check-in / check-out
- Room status: `AVAILABLE`, `OCCUPIED`, `DIRTY`, `MAINTENANCE`, `BLOCKED`
- Guest folios with line items (room charges, extras, taxes)
- Daily arrivals/departures/in-house reports

### 6. Payments
- Payment intent creation (Stripe test)
- Internal payment ledger (authorizations, captures, refunds)
- Invoice generation from folio data
- Revenue attribution per hotel

### 7. Notifications
- Event-driven notification creation
- In-app notification inbox
- Email dispatch for booking confirmations, approvals

### 8. Analytics
- Revenue by period (from confirmed bookings)
- Occupancy rate (rooms sold / total room-nights)
- ADR (Average Daily Rate)
- RevPAR (Revenue Per Available Room)
- Admin platform-wide + partner hotel-scoped dashboards

## Data Model (Core Entities)

```
User ──┬── UserRole ── Role ── RolePermission ── Permission
       ├── Booking (as guest)
       ├── Notification
       └── HotelStaff (partner/receptionist → Hotel)

Hotel ──┬── RoomType ── Room
        ├── RatePlan ── RatePlanPrice
        ├── Inventory (roomId + date → available count)
        ├── Booking
        ├── Folio
        └── HotelImage

Booking ──┬── BookingRoom
          ├── BookingGuest
          ├── Payment
          └── Folio

Folio ── FolioItem
```

## API Design

REST API at `http://localhost:4000/api/v1`

| Prefix | Access | Purpose |
|--------|--------|---------|
| `/auth` | Public | Login, register, refresh, logout |
| `/hotels` | Mixed | Search (public), CRUD (partner/admin) |
| `/bookings` | Mixed | Create/search (guest), manage (partner) |
| `/pms` | Partner/Receptionist | Check-in/out, folios, room status |
| `/admin` | Admin | Hotel approval, user management, platform stats |
| `/analytics` | Admin/Partner | Revenue, occupancy dashboards |
| `/notifications` | Authenticated | Inbox, mark read |
| `/uploads` | Partner/Admin | Hotel images, documents |
| `/payments` | Authenticated | Payment intents, history |

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15 min) + refresh tokens (7 days, rotated)
- Rate limiting on auth endpoints
- Input validation on every endpoint (Zod)
- SQL injection prevention via Prisma parameterized queries
- CORS restricted to configured origins
- Helmet security headers
- Audit log for sensitive operations

## Error Handling

Standard error response:
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_AVAILABLE",
    "message": "No rooms available for selected dates",
    "details": {}
  }
}
```

## Real-Time Partner Dashboard

Partners receive live updates on bookings, payments, folios, and reviews without manual refresh.

```
┌──────────────┐     poll 5s      ┌─────────────────────┐
│ Partner Web  │ ◄──────────────► │ GET /partner/       │
│  (Next.js)   │                  │  hotels/:id/dashboard│
└──────────────┘                  └──────────┬──────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │  Partner Service      │
                                  │  (bookings, payments, │
                                  │   folios, reviews)    │
                                  └──────────┬──────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
              PostgreSQL              Hotel Event Bus            SSE endpoint
           (source of truth)      (in-process pub/sub)      (future: Redis)
```

**Event bus** (`apps/api/src/lib/event-bus.ts`) emits on:
- `booking.created` / `booking.updated`
- `payment.captured` / `payment.pay_at_hotel`
- `hotel.updated` / `review.added`

**Production scaling path:**
1. Replace in-process EventEmitter with **Redis Pub/Sub**
2. Add **WebSocket** gateway for sub-second push
3. SSE endpoint at `GET /partner/hotels/:id/live` (already wired)

**Billing states exposed to partners:**
| State | Meaning |
|-------|---------|
| `AWAITING_PAYMENT` | Booking pending, no payment |
| `PAID_ONLINE` | UPI / Alipay / Thai QR captured |
| `PAY_AT_PROPERTY` | Pay at hotel authorized |
| `PARTIAL` | Partial payment received |
| `SETTLED` | Folio closed |

## India Branding Convention

All properties in India are displayed as **E Stays [Property Name]** (e.g. `E Stays Bengaluru Tech Park Hotel`). Auto-applied on partner onboarding when `country === 'India'`.

## Project Structure

```
estays/
├── apps/
│   ├── api/                 # Express REST API
│   │   └── src/
│   │       ├── routes/
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── middleware/
│   │       └── utils/
│   └── web/                 # Next.js portals
│       └── src/
│           ├── app/
│           │   ├── (admin)/
│           │   ├── (partner)/
│           │   ├── (user)/
│           │   └── (auth)/
│           ├── components/
│           └── lib/
├── packages/
│   ├── database/            # Prisma schema, migrations, seed
│   ├── shared/              # Types, constants, Zod schemas
│   └── logger/              # Pino logger
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Multi-Portal Routing

| Portal | URL Prefix | Roles |
|--------|-----------|-------|
| User (Guest) | `/` | Public, GUEST |
| Partner | `/partner` | PARTNER, RECEPTIONIST |
| Admin | `/admin` | SUPER_ADMIN, ADMIN |

## Finance & Settlement Engine

Dedicated modules (separate from booking/payment capture):

| Module | Path | Responsibility |
|--------|------|----------------|
| Commission | `commission.service.ts` | Per-property rules: FLAT, PERCENTAGE, PROMOTIONAL, ZERO |
| Booking Finance | `booking-finance.service.ts` | Financial snapshot per booking on payment |
| Ledger | `ledger.service.ts` | Journal + ledger entries (reversals only, never delete) |
| Settlement | `settlement.service.ts` | EOD statements, partner settle flow, documents |
| Settlement Email | `settlement-email.service.ts` | Statement/receipt/CSV to configurable recipients |

API prefix: `/api/v1/finance/`

- Partner: `/finance/partner/hotels/:hotelId/finance/*`
- Admin: `/finance/admin/billing/*`

Partner UI: `/partner/finance` · Admin UI: `/admin?tab=billing`
| Admin | `/admin` | ADMIN, SUPER_ADMIN |
| Auth | `/login`, `/register` | Public |
