# E Stays

Production-ready hospitality SaaS platform — PMS, Booking Engine, Partner Portal, Admin Portal, and Guest Portal.

## Push 1 — MVP Deploy (Render + Vercel)

Repo: [github.com/TheDotProtocol/estays](https://github.com/TheDotProtocol/estays)

| Service | Host | Config |
|---------|------|--------|
| Web | **Vercel** | Root dir: `apps/web` |
| API | **Render** | `render.yaml` blueprint |
| Database | **Render Postgres** | via blueprint |

**Full guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### After first deploy

```bash
# Migrations (from your machine or Render shell)
DATABASE_URL="postgresql://..." npm run db:migrate:deploy --workspace=@estays/database

# Production bootstrap (roles + amenities + optional admin)
BOOTSTRAP_ADMIN_EMAIL="you@company.com" \
BOOTSTRAP_ADMIN_PASSWORD="strong-password-here" \
DATABASE_URL="postgresql://..." \
npm run db:seed:production
```

Set `CORS_ORIGIN` on Render to your Vercel URL. Set `NEXT_PUBLIC_API_URL` on Vercel to `https://your-api.onrender.com/api/v1`.

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for PostgreSQL, Redis, Mailhog)

### Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
cp .env.example packages/database/.env

# 3. Start infrastructure
docker compose up -d

# 4. Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Start development servers
npm run dev
```

### URLs

| Service | URL |
|---------|-----|
| API | http://localhost:4000 |
| API Health | http://localhost:4000/api/v1/health |
| Web App | http://localhost:3000 |
| Mailhog UI | http://localhost:8025 |
| Prisma Studio | `npm run db:studio` |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@estays.com | Admin123! |
| Partner | partner@grandplaza.com | Partner123! |
| Receptionist | reception@grandplaza.com | Reception123! |
| Guest | guest@example.com | Guest123! |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design.

See [docs/ROADMAP.md](docs/ROADMAP.md) for development milestones.

## Project Structure

```
estays/
├── apps/
│   ├── api/          # Express REST API
│   └── web/          # Next.js portals (M7)
├── packages/
│   ├── database/     # Prisma schema & seed
│   ├── shared/       # Types, schemas, constants
│   └── logger/       # Pino structured logging
└── docker-compose.yml
```

## API Endpoints (Milestone 1)

```
POST   /api/v1/auth/register     Register new guest account
POST   /api/v1/auth/login        Login
POST   /api/v1/auth/refresh      Refresh access token
POST   /api/v1/auth/logout       Logout
GET    /api/v1/auth/me           Get current user (auth required)
GET    /api/v1/health            Health check
```

## Development Status

- [x] **M1** — Foundation: monorepo, Prisma schema, auth, RBAC, logging
- [ ] **M2** — Hotel management & inventory
- [ ] **M3** — Booking engine
- [ ] **M4** — PMS (check-in/out, folios)
- [ ] **M5** — Payments & notifications
- [ ] **M6** — Analytics & file uploads
- [ ] **M7** — Frontend portals
- [ ] **M8** — Full seed data & deployment

## License

Proprietary — E Stays Platform
