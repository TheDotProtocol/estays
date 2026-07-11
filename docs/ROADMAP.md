# E Stays — Development Roadmap

## Milestones

### M1 — Foundation & Core Infrastructure ✅ (Current)
- [x] Turborepo monorepo scaffolding
- [x] Docker Compose (PostgreSQL + Redis)
- [x] Complete Prisma schema (all entities)
- [x] Database migrations
- [x] Shared package (types, Zod schemas, constants)
- [x] Logger package (Pino)
- [x] Express API skeleton with middleware
- [x] JWT authentication (register, login, refresh, logout)
- [x] RBAC middleware + permission system
- [x] Global error handler + request validation
- [x] Health check endpoint

### M2 — Hotel Management & Inventory ✅
- [x] Hotel CRUD with approval workflow
- [x] Room types and physical rooms
- [x] Rate plans and dynamic pricing
- [x] Inventory engine (availability ledger)
- [x] Amenity management
- [x] Partner hotel onboarding API
- [x] Admin hotel approval API
- [x] Web UI: search, hotel detail, partner portal, admin portal

### M3 — Booking Engine ✅
- [x] Availability search API
- [x] Booking creation with inventory hold
- [x] Booking cancellation
- [x] Guest booking history
- [x] Booking confirmation notifications
- [x] Web checkout flow

### M4 — PMS (Property Management)
- [ ] Check-in workflow (booking → occupied room)
- [ ] Check-out workflow (folio settlement)
- [ ] Room status management
- [ ] Folio creation and line items
- [ ] Daily operations dashboard data
- [ ] In-house guest list

### M5 — Payments & Notifications ✅ (partial)
- [x] Payment intent creation (Stripe + mock dev mode)
- [x] Internal payment ledger
- [x] Refund processing (admin)
- [x] In-app notification system
- [ ] Email notifications (booking, approval)

### M6 — Analytics & File Uploads
- [ ] Revenue dashboard (from booking records)
- [ ] Occupancy, ADR, RevPAR calculations
- [ ] Admin platform analytics
- [ ] Partner hotel analytics
- [ ] File upload service (hotel images)
- [ ] Image management API

### M7 — Frontend Portals
- [ ] Auth pages (login, register)
- [ ] User portal (search, book, my bookings)
- [ ] Partner portal (dashboard, rooms, pricing, PMS)
- [ ] Admin portal (hotels, users, analytics, approvals)
- [ ] Responsive layout with navigation per role

### M8 — Seed Data & Deployment
- [ ] Comprehensive seed script (hotels, users, bookings)
- [ ] Demo data across all modules
- [ ] Production Dockerfiles
- [ ] Environment configuration
- [ ] README with setup instructions
- [ ] End-to-end verification

## Demo Credentials (Post-Seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@estays.com | Admin123! |
| Partner (Hotel Owner) | partner@grandplaza.com | Partner123! |
| Receptionist | reception@grandplaza.com | Reception123! |
| Guest | guest@example.com | Guest123! |

## Local Development

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Start dev servers
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000
- API Health: http://localhost:4000/api/v1/health
