# E Stays — Production Deployment (Render + Vercel)

This guide deploys **E Stays** with:

| Service | Host | Notes |
|---------|------|-------|
| Web (Next.js) | **Vercel** | Guest, partner, and admin UI |
| API (Express) | **Render** | REST API + uploads |
| PostgreSQL | **Render** | Managed database |
| Redis | Optional | Skip initially; add later if needed |

---

## 1. PostgreSQL on Render

1. Render Dashboard → **New** → **PostgreSQL**
2. Name: `estays-db`, region closest to users
3. Copy the **Internal Database URL** (for API on Render) and **External URL** (for local migrations)

---

## 2. API on Render

1. **New** → **Web Service** → connect your GitHub repo
2. Settings:
   - **Root Directory**: leave blank (monorepo root)
   - **Runtime**: Node 20+
   - **Build Command**:
     ```bash
     npm install && npm run build --workspace=@estays/shared && npm run build --workspace=@estays/api && npm run generate --workspace=@estays/database
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/index.js
     ```
   - **Health Check Path**: `/api/v1/health`

3. **Environment variables** (Render → Environment):

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Render Postgres internal URL |
   | `JWT_ACCESS_SECRET` | Random 32+ char string |
   | `JWT_REFRESH_SECRET` | Different random 32+ char string |
   | `JWT_ACCESS_EXPIRES_IN` | `45m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `CORS_ORIGIN` | `https://your-app.vercel.app` |
   | `API_URL` | `https://your-api.onrender.com` |
   | `UPLOAD_DIR` | `/var/data/uploads` (attach a Render disk, 1GB+) |
   | `EMAIL_FROM` | `noreply@estays.com` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Your mail provider |
   | `STRIPE_SECRET_KEY` | Live or test key |
   | `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard |

4. **Persistent disk** (for hotel/KYC uploads):
   - Render → your API service → **Disks** → Add disk, mount at `/var/data/uploads`
   - Set `UPLOAD_DIR=/var/data/uploads`

5. After first deploy, run migrations **once** from your machine (or Render Shell):

   ```bash
   DATABASE_URL="postgresql://..." npm run migrate:deploy --workspace=@estays/database
   ```

---

## 3. Web on Vercel

1. Import the repo → **Framework**: Next.js
2. **Root Directory**: `apps/web`
3. **Environment variables**:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://your-api.onrender.com/api/v1` |

4. Deploy. Update Render `CORS_ORIGIN` to match the final Vercel URL (including custom domain).

---

## 4. Production seed strategy

**Do not** run the full dev seed in production. It creates demo hotels, bookings, and test accounts.

### Recommended approach

1. **Migrations only** in production:
   ```bash
   npm run migrate:deploy --workspace=@estays/database
   ```

2. **Bootstrap admin once** (manually or via a protected script):
   - Create one `SUPER_ADMIN` user with a strong password
   - Do not commit production credentials

3. **Optional minimal seed** (amenities + roles only):
   - Extract amenity/role seeding from `packages/database/src/seed.ts` into a `seed-production.ts` that skips demo hotels/bookings
   - Run once: `tsx src/seed-production.ts`

4. **Partners and properties** are created through the live partner onboarding flow after KYC approval.

### Dev/staging credentials (never use in production)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@estays.com` | `Admin123!` |
| Partner | `partner@estays.com` | `Partner123!` |

---

## 5. Post-deploy checklist

- [ ] `GET https://your-api.onrender.com/api/v1/health` returns OK
- [ ] Guest signup OTP email delivers
- [ ] Partner KYC upload works (disk mounted)
- [ ] Property onboarding (bulk API + photo upload) completes
- [ ] Admin can approve partners and properties
- [ ] Stripe webhooks point to production API URL
- [ ] Custom domain + HTTPS on Vercel
- [ ] `CORS_ORIGIN` matches production web URL exactly

---

## 6. Local dev reminder

If the web app shows **"Unable to reach E Stays servers"**, start the API:

```bash
npm run dev
```

Ensure `apps/web/.env.local` has:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## 7. Auth session length

Access tokens expire after **45 minutes** (`JWT_ACCESS_EXPIRES_IN=45m`). The web client auto-refreshes on expiry when the API is reachable. Refresh tokens last 7 days.
