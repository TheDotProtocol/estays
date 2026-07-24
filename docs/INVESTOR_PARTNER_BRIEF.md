# E Stays — Investor & Partner Brief

**One-page overview · July 2026**

---

## What we are

**E Stays** is the operating system for independent hotels — one platform to **sell rooms, run operations, manage staff, and get paid transparently**.

Unlike OTAs that only bring demand (and opaque commissions), or PMS tools that only run the front desk, E Stays unifies the full hotel lifecycle in a single stack.

| Layer | What hotels get |
|-------|-----------------|
| **Guest engine** | Search, book, pay (UPI / pay-at-hotel / regional QR), loyalty (EStays Cash) |
| **E PMS** | Check-in/out, room board, folios, walk-ins, housekeeping, receipt PDFs |
| **Finance** | Commission rules, ledger, weekly settlements, bank payouts, statement PDFs |
| **Analytics** | Occupancy, ADR, RevPAR, CSV export — hotel + platform views |
| **HR & payroll** | Employees, attendance, leave, India payroll (PF/ESI/TDS), payslip PDFs |
| **Admin** | Partner KYC, hotel approval, refunds, billing, complaints |

**Live today:** [estayshotels.com](https://www.estayshotels.com) · API on Render · Postgres on Render · 12 DB migrations applied.

---

## The problem

Independent hotels (10–80 rooms) typically juggle **5+ disconnected tools**:

- OTA listings (high commission, no guest relationship)
- A basic PMS or spreadsheets for front desk
- Separate accounting for settlements and GST
- WhatsApp and phone for staff coordination

Result: **revenue leakage, opaque payouts, operational chaos, and no single source of truth.**

---

## Our wedge

| vs OTAs | vs cloud PMS | E Stays |
|---------|--------------|---------|
| They own the guest | They don't sell rooms | **Booking + ops in one login** |
| 15–25% opaque commission | Per-module pricing | **Transparent settlement engine** |
| No PMS or HR | No marketplace | **Full stack for independents** |
| India payments as afterthought | Limited India payroll | **UPI, KYC, PF/ESI/TDS built in** |

**Positioning:** *"Stop juggling five tools. Run your hotel on E Stays."*

---

## Traction & product maturity

| Area | Status |
|------|--------|
| Core booking + checkout | ✅ Production |
| Partner onboarding + KYC + admin approval | ✅ Production |
| PMS, analytics, HR, finance/settlement | ✅ Built & deployed |
| Demo inventory (Bengaluru, Mumbai, Goa) | ✅ Seeded |
| Payment webhooks (verified capture) | 🔄 Bank gateway integration in progress |
| Automated test suite + CI | 📋 Next 90-hour sprint |
| Channel manager / OTA sync | 📋 Roadmap |

**Readiness:** Strong for **controlled pilot** (5–20 hotels). Commercial scale after payment verification and ops hardening.

---

## Business model

- **Commission** on direct bookings (configurable per hotel / tier)
- **SaaS subscription** for PMS + HR + analytics modules (future tiering)
- **Settlement float / payment processing** margin (post bank gateway)
- **White-label** for hotel associations and regional brands (12-month horizon)

Unit economics improve as hotels run **more of their stack** on E Stays — not just list rooms.

---

## Target market (phase 1)

- **Who:** Independent and small-chain hotels, 10–80 rooms, Tier 1/2 India
- **Pain:** OYO/OTA commission fatigue, tool sprawl, unclear payouts
- **Beachhead cities:** Bengaluru, Mumbai, Goa, Hyderabad, Pune

---

## Why now

- UPI penetration makes direct booking viable for Indian hotels
- Post-COVID independents want **direct revenue** without losing ops simplicity
- Legacy PMS players are slow to ship modern UX + marketplace in one product
- We have a **deployed, broad MVP** — not a slide deck

---

## 90-hour sprint (next milestone)

Focused execution to move from **pilot-ready → commercially trustworthy**:

1. Real payment webhooks (bank gateway)
2. Partner payout trust dashboard
3. CI + smoke tests + error monitoring
4. S3/CDN for images and KYC
5. WhatsApp booking alerts
6. Embeddable booking widget for partner websites

See [ENGINEERING_PLAN_90H.md](./ENGINEERING_PLAN_90H.md) for full epic breakdown.

---

## The ask

| Audience | Ask |
|----------|-----|
| **Investors** | Seed capital for payment integration, pilot onboarding, and 2–3 city launch |
| **Hotel partners** | Pilot 3–6 months — reduced commission, full PMS + finance stack, dedicated onboarding |
| **Strategic partners** | Bank / PSP for verified UPI + settlement rails; WhatsApp BSP for guest comms |

---

## Team & contact

**E Stays Hotels** · Hospitality SaaS · India-first, multi-currency ready

- Web: [www.estayshotels.com](https://www.estayshotels.com)
- Partner inquiries: partner@estays.com
- Repo: [github.com/TheDotProtocol/estays](https://github.com/TheDotProtocol/estays)

---

*Confidential — for investor and partner discussions only.*
