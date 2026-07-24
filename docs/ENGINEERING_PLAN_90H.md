# E Stays — 90-Hour Engineering Plan

**Sprint goal:** Move from **pilot-ready (85%)** → **commercially trustworthy (95%)** for controlled hotel onboarding.

**Total effort:** 90 hours (~11–12 focused working days, or 2.5 weeks at ~36 hrs/week)

**Prerequisite:** Bank / PSP meeting complete — merchant IDs and webhook spec in hand.

---

## Hour budget summary

| # | Epic | Hours | Priority |
|---|------|------:|----------|
| 0 | Alignment & doc sync | 4 | P0 |
| 1 | Payment verification & webhooks | 22 | P0 |
| 2 | Partner payout trust dashboard | 14 | P0 |
| 3 | CI, smoke tests & monitoring | 16 | P0 |
| 4 | S3/CDN uploads | 10 | P1 |
| 5 | WhatsApp notifications | 12 | P1 |
| 6 | Embeddable booking widget | 8 | P1 |
| 7 | GST invoice PDF + launch checklist | 4 | P1 |
| | **Total** | **90** | |

---

## Sequencing (dependency graph)

```
Hour 0–4    Epic 0: Doc sync, env audit, sprint board
              ↓
Hour 4–26   Epic 1: Payment webhooks (BLOCKER for commercial launch)
              ↓
Hour 26–40  Epic 2: Partner trust dashboard (depends on Epic 1 data)
              ↓
Hour 40–56  Epic 3: CI + tests + Sentry (parallel-safe after Epic 1 core paths frozen)
              ↓
Hour 56–66  Epic 4: S3/CDN (can start at hour 40 in parallel if second dev)
              ↓
Hour 66–78  Epic 5: WhatsApp (depends on Epic 1 booking confirm events)
              ↓
Hour 78–86  Epic 6: Booking widget embed
              ↓
Hour 86–90  Epic 7: GST invoice + final launch checklist sign-off
```

**Critical path:** Epic 0 → 1 → 2 → 3. Epics 4–6 can overlap with 3 if two people are available.

---

## Epic 0 — Alignment & doc sync (4 hrs)

**Outcome:** Single source of truth for what is shipped vs what is next.

| Task | Hrs | Deliverable |
|------|----:|-------------|
| Update `README.md` development status to reflect PMS, analytics, HR, finance | 1 | Accurate public readme |
| Rewrite `docs/ROADMAP.md` — mark M4–M7 complete, add M9 commercial hardening | 1 | Current roadmap |
| Audit production env vars on Render + Vercel against `.env.example` | 1 | Env checklist (pass/fail) |
| Create sprint board (GitHub Issues or Linear) with epics 1–7 as milestones | 1 | Trackable backlog |

**Exit criteria:** New engineer can read docs and understand true product state in 15 minutes.

---

## Epic 1 — Payment verification & webhooks (22 hrs) — P0

**Outcome:** Payment confirmed by gateway webhook, not guest self-report. Booking auto-confirms on verified payment.

| Task | Hrs | Files / area |
|------|----:|--------------|
| Define payment state machine: `PENDING` → `PROCESSING` → `CONFIRMED` / `FAILED` / `EXPIRED` | 2 | `payment.service.ts`, Prisma `Payment` enum if needed |
| Implement webhook endpoint `POST /api/v1/payments/webhook/:provider` with signature verification | 6 | New `payment-webhook.routes.ts`, middleware for HMAC/signature |
| Wire real merchant UPI / bank QR IDs from env (remove placeholders) | 2 | `packages/shared/src/currency.ts`, Render env |
| On webhook success: confirm payment → confirm booking → create `BookingFinancial` → notify guest + partner | 4 | `payment.service.ts`, `booking.service.ts`, `transactional-email.service.ts` |
| Idempotency: duplicate webhooks do not double-confirm | 2 | Payment repository, unique constraint on gateway txn ID |
| Admin view: payment status + gateway reference on Transactions tab | 2 | `apps/web/.../admin/page.tsx`, admin API |
| E2E manual test script: book → pay → webhook → confirmed (document in checklist) | 2 | `docs/DEPLOYMENT_CHECKLIST.md` |
| Keep manual confirm as fallback for pay-at-hotel only | 2 | `payment.routes.ts` — restrict `POST /confirm` to `PAY_AT_HOTEL` |

**Exit criteria:**
- [ ] Real UPI payment auto-confirms booking within 30s of webhook
- [ ] Duplicate webhook is no-op
- [ ] Pay-at-hotel still works without webhook
- [ ] Failed / expired payments do not confirm booking

**Risk:** Bank spec delay — **fallback:** ship with Razorpay/Cashfree sandbox in 8 hrs if bank webhook spec slips.

---

## Epic 2 — Partner payout trust dashboard (14 hrs) — P0

**Outcome:** Partner sees exactly what they earned, what was deducted, and when they get paid. Transparency = retention.

| Task | Hrs | Files / area |
|------|----:|--------------|
| API: `GET /finance/partner/earnings-summary` — gross, commission, tax, net, pending vs settled | 3 | `finance.routes.ts`, `settlement.service.ts` |
| API: per-booking earnings breakdown linked to settlement items | 2 | Finance service |
| UI: Finance page "Earnings" tab — summary cards + booking-level table | 4 | `apps/web/.../partner/finance/page.tsx` |
| UI: Settlement timeline — upcoming payout date, last settlement, download PDF | 3 | Partner finance page |
| UI: "Dispute" CTA — opens support email with settlement ID pre-filled | 1 | Partner finance |
| Empty state + tooltips explaining commission and tax lines | 1 | Copy for partner trust |

**Exit criteria:**
- [ ] Partner can answer "what did I earn this week?" without contacting support
- [ ] Every settled booking links to a settlement document PDF

---

## Epic 3 — CI, smoke tests & monitoring (16 hrs) — P0

**Outcome:** Regressions caught before deploy. Production errors visible within minutes.

| Task | Hrs | Files / area |
|------|----:|--------------|
| GitHub Actions: lint + typecheck + build on PR to `main` | 2 | `.github/workflows/ci.yml` |
| Vitest setup in `apps/api` with test DB or mocked Prisma | 2 | `apps/api/vitest.config.ts` |
| Smoke tests: auth login, hotel search, create booking (mocked payment), settlement calc | 6 | `apps/api/src/__tests__/` |
| Smoke test: RBAC — partner cannot access admin routes | 2 | API tests |
| Sentry integration — API + Next.js, source maps on Vercel | 2 | `apps/api/src/app.ts`, `apps/web/sentry.*.ts` |
| Health check monitoring note + Render/Vercel deploy hook on green CI | 1 | `docs/DEPLOYMENT.md` |
| Uptime ping on `/api/v1/health` (UptimeRobot or Better Stack — config doc only) | 1 | Deployment checklist |

**Exit criteria:**
- [ ] PR cannot merge if build fails
- [ ] ≥8 smoke tests pass covering auth, booking, finance, RBAC
- [ ] Sentry captures a test error in staging

---

## Epic 4 — S3/CDN uploads (10 hrs) — P1

**Outcome:** Hotel images and KYC docs survive Render redeploys; fast CDN delivery.

| Task | Hrs | Files / area |
|------|----:|--------------|
| S3 client abstraction: `upload.service.ts` with local fallback for dev | 3 | New `apps/api/src/services/storage.service.ts` |
| Migrate hotel image upload to S3; return CDN URL | 3 | `upload.routes.ts`, hotel image APIs |
| Migrate KYC upload to S3 (private bucket + signed URL for admin view) | 2 | `upload.routes.ts`, admin partner KYC view |
| Env vars: `S3_BUCKET`, `S3_REGION`, `CDN_URL`, IAM keys in Render secrets | 1 | `.env.example`, Render dashboard |
| One-time migration script for existing local uploads (if any in prod) | 1 | `packages/database/scripts/` |

**Exit criteria:**
- [ ] New hotel photo upload returns CDN URL
- [ ] Redeploy does not lose images
- [ ] KYC docs not publicly listable

---

## Epic 5 — WhatsApp notifications (12 hrs) — P1

**Outcome:** Guests and partners get booking alerts on the channel they actually read in India.

| Task | Hrs | Files / area |
|------|----:|--------------|
| WhatsApp provider adapter (Meta Cloud API or MSG91 / Gupshup) | 3 | `apps/api/src/services/whatsapp.service.ts` |
| Templates: booking confirmed (guest), new booking (partner), check-in reminder (guest) | 3 | Template IDs in env |
| Hook into `booking.service.ts` confirm + `pms.service.ts` check-in reminder job | 3 | Event after payment confirm |
| Partner opt-in: phone number on profile + notification preferences | 2 | Partner settings API + UI stub |
| Log delivery status; fail gracefully if WhatsApp down (email fallback) | 1 | Notification service |

**Exit criteria:**
- [ ] Guest receives WhatsApp within 60s of booking confirmation
- [ ] Partner receives WhatsApp on new reservation
- [ ] SMS/email fallback if WhatsApp fails

**Note:** Template approval with Meta can take 24–48 hrs — submit templates at **hour 4** (parallel with Epic 1).

---

## Epic 6 — Embeddable booking widget (8 hrs) — P1

**Outcome:** Partner embeds a booking button on their own website — first step toward channel independence.

| Task | Hrs | Files / area |
|------|----:|--------------|
| Public route: `/widget/[hotelSlug]` — minimal chrome checkout | 3 | `apps/web/src/app/widget/[slug]/page.tsx` |
| Generate embed snippet in partner dashboard ("Add to your website") | 2 | Partner dashboard settings tab |
| CORS + iframe-friendly headers for widget route | 1 | `next.config.ts`, middleware |
| Track widget-originated bookings via `source=WIDGET` on booking | 2 | `booking.service.ts`, analytics |

**Exit criteria:**
- [ ] Partner copies embed code → booking works on external HTML page
- [ ] Widget bookings appear in partner analytics with source tag

---

## Epic 7 — GST invoice PDF + launch checklist (4 hrs) — P1

**Outcome:** Finance paperwork hotels and CAs expect; signed launch checklist.

| Task | Hrs | Files / area |
|------|----:|--------------|
| GST invoice PDF on booking confirmation (guest) — hotel GSTIN, HSN, tax breakdown | 2 | New `invoice-pdf.service.ts`, hook from booking confirm |
| Download link on guest booking detail + email attachment | 1 | Web bookings page, transactional email |
| Walk `docs/DEPLOYMENT_CHECKLIST.md` — mark pass/fail for each item | 1 | Updated checklist with sign-off date |

**Exit criteria:**
- [ ] Guest can download GST invoice PDF for confirmed paid booking
- [ ] Deployment checklist ≥90% green for pilot launch

---

## Suggested schedule (solo developer)

| Block | Hours | Epics | Focus |
|-------|------:|-------|-------|
| **Day 1** | 8 | 0 + 1 (start) | Docs, env audit, webhook endpoint scaffold |
| **Day 2** | 8 | 1 | Webhook verification + booking auto-confirm |
| **Day 3** | 8 | 1 + 2 (start) | Payment E2E, earnings API |
| **Day 4** | 8 | 2 | Partner trust dashboard UI |
| **Day 5** | 8 | 3 | CI pipeline + smoke tests |
| **Day 6** | 8 | 3 + 4 | Sentry + S3 upload migration |
| **Day 7** | 8 | 4 + 5 | CDN verify, WhatsApp templates + hooks |
| **Day 8** | 8 | 5 + 6 | WhatsApp E2E, booking widget |
| **Day 9** | 8 | 6 + 7 | Widget polish, GST invoice, checklist |
| **Day 10** | 18 | Buffer / overflow | Any epic slip + pilot hotel onboarding support |

*Submit WhatsApp templates on Day 1. Start S3 on Day 5 if running solo.*

---

## Definition of done (sprint)

The 90-hour sprint is **complete** when all of the following are true:

1. **Payments:** Verified webhook confirms booking; manual QR confirm disabled for UPI/QR
2. **Trust:** Partner finance page shows earnings breakdown and settlement timeline
3. **Reliability:** CI green on `main`; ≥8 API smoke tests; Sentry live
4. **Infra:** New uploads go to S3/CDN
5. **Comms:** WhatsApp booking alerts working for guest + partner
6. **Growth:** Embed widget live for ≥1 pilot hotel
7. **Compliance:** GST invoice PDF downloadable
8. **Docs:** README, ROADMAP, and DEPLOYMENT_CHECKLIST reflect reality

---

## What we explicitly defer (post-90h)

| Item | Why defer |
|------|-----------|
| Channel manager / OTA sync | Needs Epic 6 widget data first |
| Dynamic pricing AI | Needs 30+ days booking data from pilots |
| Multi-property group accounts | Sales motion not yet at chain level |
| Native mobile apps | PWA + WhatsApp covers 90% for phase 1 |
| Redis caching | No perf bottleneck until 50+ concurrent partners |
| White-label / regional brands | After 20 successful pilot hotels |

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Bank webhook spec delayed | Razorpay/Cashfree sandbox in 8 hrs as bridge |
| WhatsApp template approval slow | Email remains primary; WhatsApp enables when approved |
| Solo dev, epic slip | Day 10 buffer (18 hrs); cut Epic 6 to 4 hrs (link-only, no iframe) |
| S3 cost / config | Start with one bucket, CloudFront optional at first |

---

## Related docs

- [INVESTOR_PARTNER_BRIEF.md](./INVESTOR_PARTNER_BRIEF.md) — one-page external narrative
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — pre-launch verification
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design reference

---

*Last updated: July 2026 · Owner: Engineering / CTO*
