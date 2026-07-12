# E Stays — Pre-Deployment Checklist

Use this checklist before opening the platform to real-world users.

## Infrastructure

- [ ] PostgreSQL production database provisioned (managed service recommended)
- [ ] Redis instance for sessions/caching (if enabling rate limits at scale)
- [ ] Environment variables set for API and Web (see `.env.example`)
- [ ] `DATABASE_URL` uses SSL in production
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong, unique, rotated secrets
- [ ] `UPLOAD_DIR` points to persistent storage (S3/CDN recommended for images)
- [ ] `NEXT_PUBLIC_API_URL` points to production API domain
- [ ] HTTPS enabled on all domains (TLS certificates)
- [ ] CORS configured to allow only production web domain
- [ ] Database backups scheduled (daily minimum)

## Database

- [ ] Run `npm run db:migrate` on production database
- [ ] Verify seed data is NOT run in production (or run once with `isDemo: false` real properties only)
- [ ] Connection pooling configured (PgBouncer or Prisma connection limits)
- [ ] Indexes verified on high-traffic queries (bookings, hotels, inventory)

## Payments

- [ ] Replace placeholder UPI ID (`estays@icici`) with real merchant UPI
- [ ] Replace placeholder Alipay merchant ID with production credentials
- [ ] Replace Thai QR merchant ID with PromptPay production ID
- [ ] Implement real payment webhook verification (currently manual QR confirmation)
- [ ] Test UPI, Alipay, Thai QR, and Pay at Hotel flows end-to-end
- [ ] Refund policy tested with admin refund API

## Security

- [ ] Remove or protect quick-login credentials on `/login` page
- [ ] Rate limiting reviewed for auth endpoints
- [ ] File upload size limits and MIME type validation verified
- [ ] RBAC permissions audited for partner vs admin vs guest
- [ ] Audit logs monitored for suspicious activity
- [ ] `.env` files excluded from git; secrets in vault/CI secrets

## Partner Portal

- [ ] Partner can register property → admin approves → goes ACTIVE
- [ ] Photo upload works with production storage/CDN
- [ ] Partner bookings list shows real reservations
- [ ] Inventory and pricing updates reflect on public search
- [ ] Partner support email (`partner@estays.com`) monitored

## Guest Experience

- [ ] City autocomplete resolves aliases (e.g. Bangalore → Bengaluru)
- [ ] Property images display on search and detail pages
- [ ] Multi-currency conversion accurate with live rates (currently static rates)
- [ ] EStays Cash rewards earn correctly on booking confirmation
- [ ] Signup welcome bonus (500 points) credited
- [ ] Email notifications for booking confirmation (SMTP configured)

## Admin

- [ ] Admin dashboard loads production stats
- [ ] Hotel approval/rejection workflow tested
- [ ] Admin portal accessible only to ADMIN/SUPER_ADMIN roles

## Legal & Compliance

- [ ] Privacy Policy, Terms, Refund Policy reviewed by legal counsel
- [ ] Company details accurate on all legal pages
- [ ] GDPR/data retention policies implemented if serving EU users
- [ ] Cookie consent banner if required by jurisdiction

## Performance & Monitoring

- [ ] API health check (`/api/v1/health`) monitored
- [ ] Error tracking configured (Sentry or similar)
- [ ] Application logs aggregated (Pino → CloudWatch/Datadog)
- [ ] Load test search + booking flow under expected traffic
- [ ] CDN configured for static assets and hotel images

## Deployment Commands

```bash
# Build
npm run build

# Migrate production DB
cd packages/database && npx prisma migrate deploy

# Start API (production)
cd apps/api && npm start

# Start Web (production)
cd apps/web && npm start
```

## Post-Launch (First 48 Hours)

- [ ] Monitor booking creation and payment confirmation rates
- [ ] Verify partner onboarding with first real property
- [ ] Check loyalty points accrual for new signups and bookings
- [ ] Respond to support emails within SLA
- [ ] Review audit logs for errors

## Known Limitations (MVP)

| Feature | Status |
|---------|--------|
| PMS (check-in/out, folios) | Implemented — `/partner/pms` |
| Analytics dashboard | Implemented — `/partner/analytics` + `/api/v1/analytics` |
| HR / Payroll / Attendance | Implemented — `/partner/hr` + `/api/v1/hr` |
| Live exchange rates | Static rates in `packages/shared/src/currency.ts` |
| QR payment verification | Manual "I've completed payment" button |
| Email delivery | Requires SMTP configuration |
| Real-time notifications | In-app only |

---

**Sign-off**

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering | | | ☐ |
| Product | | | ☐ |
| Legal | | | ☐ |
| Operations | | | ☐ |
