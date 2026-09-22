# thenga.com (Hustle Economy)

Mobile-first community marketplace and business-management platform for informal-economy hustlers in rural KwaZulu-Natal, South Africa. Onboards hustlers through a facilitator verification pipeline, tracks their income, hosts a community marketplace with customer checkout and driver dispatch, and runs a point-of-sale flow for in-store sales.

**User-facing brand:** thenga.com (Ingwenya Digital (Pty) Ltd). Internal codename and Java package (`com.hustle.economy`), database tables, and role enum values remain `hustle`/`Hustle` — this was a surface rebrand only, not a package rename.

For the full feature history, known gaps, and in-progress design specs, see [`PROGRESS_UPDATE.md`](PROGRESS_UPDATE.md). For project rules (mobile-first mandate, security requirements, API conventions, what not to touch), see [`CLAUDE.md`](CLAUDE.md). For draft specs open for review, see [`docs/README.md`](docs/README.md).

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | Java 21 · Spring Boot 3 · Spring Data JPA · PostgreSQL |
| Frontend | Angular 18 (standalone components) · Tailwind CSS |
| Infra    | Docker Compose locally; Netlify (frontend) + Hostinger VPS behind Traefik (backend) in production |

## Local development

### Prerequisites
- Docker + Docker Compose
- Node 20+ (only if running Angular outside Docker)
- Java 21 (only if running Spring Boot outside Docker)

### Run everything with Docker Compose
```bash
docker compose up --build
```
Services exposed:
- API → http://localhost:8080
- Angular UI → http://localhost:4173
- Postgres → localhost:5432

### Environment configuration
Copy [`.env.example`](.env.example) to `.env` in the repo root before running Compose. At minimum it needs:
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
POSTGRES_DB=hustle
STAFF_PHONE=your-phone-number   # seeded on first startup — COORDINATOR role
STAFF_PASSWORD=change-me        # required, no default: the backend will not boot without it
```
`N8N_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` are optional locally (needed only for survey PDF report generation). `R2_ACCESS_KEY` / `R2_SECRET_KEY` are optional — when set, uploaded images go to Cloudflare R2 instead of the local `uploads_data` Docker volume.

### Running services manually (optional)
**Backend** — no `mvnw` wrapper is checked in; use a local Maven install:
```bash
cd backend
mvn spring-boot:run
```

**Frontend**
```bash
cd frontend
npm install
npm start   # ng serve on http://localhost:4200
```

### Tests
```bash
cd backend && mvn test              # integration tests, needs Docker running (Testcontainers)
cd frontend && npm run test:e2e     # Playwright
```

## Architecture

```
backend/    — Spring Boot 3.x REST API (controller → service → entity/dto/mapper → repository)
frontend/   — Angular 18 standalone components, signals-based auth
dashboard/  — Nginx config / static serving
docs/       — Design specs open for review (not yet built — see docs/README.md)
tests/      — Integration and E2E suites
docker-compose.yml       — local dev stack (Postgres, backend, frontend/nginx)
docker-compose.prod.yml  — production stack on the VPS (no frontend service; Traefik routes instead)
```

Auth is unified through `AppUser` / `UnifiedAuthService` (single login/register issuing an `X-Auth-Token` session, plus a bridged `X-Customer-Token` for marketplace checkout). Roles (`CUSTOMER`, `HUSTLER`, `DRIVER`, `FACILITATOR`, `COORDINATOR`) are checked server-side on every protected endpoint — never trust a client-supplied role.

### Backend controllers (`/api/...`)
`applicants`, `auth`, `communities`, `customers`, `drivers`, `facilitator`, `hustlers` (application decisions/profile), hustler self-service, `income`, `notifications`, `operations`, `orders`, `products`, `sales` (POS), survey assignments/questions/templates, `uploads`.

### Frontend surfaces
Marketplace with category/community filters, hustler dashboard (income, products, orders, POS/barcode scanning), facilitator applicant pipeline + coordinator view, driver dashboard with Leaflet map dispatch, customer checkout/orders, survey forms. PWA-enabled (`@angular/pwa`, `ngsw-config.json`).

## Deployment

- **Frontend (production):** Netlify, auto-deploys from `main`. `netlify.toml` rewrites `/api/*` to the VPS backend as a same-origin proxy.
- **Backend (production):** Hostinger VPS, routed through Traefik with Let's Encrypt TLS. `.github/workflows/deploy-vps.yml` runs `docker-compose.prod.yml` on every push to `main` — **never** the plain `docker-compose.yml` in production, it has no Traefik labels and will break routing.
- Uploaded images persist to the `uploads_data` Docker volume in both compose files (or Cloudflare R2 when configured) — do not remove this mount.

## Team workflow

Two developer identities work this repo: **Sandile.Claude** (senior, reviews everything, only one who merges to `main`) and **Sandile.Codex** (junior, works on `development` / `feature/*`). See [`AGENTS.md`](AGENTS.md) for the junior's brief and [`CODE_REVIEWS.md`](CODE_REVIEWS.md) for the review log and joint decisions.

## Security notes

Treat delivery addresses, GPS coordinates, and phone numbers as PII — never log them, mask phone numbers in list views. See the Security Requirements section of [`CLAUDE.md`](CLAUDE.md) for the full list enforced on every endpoint.
