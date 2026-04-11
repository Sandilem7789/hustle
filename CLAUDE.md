# Hustle WebApp — Claude Code Instructions

## Project Overview
Hustle Economy is a mobile-first community marketplace and business management platform for informal economy hustlers in rural KwaZulu-Natal, South Africa. It connects buyers and sellers across underserved communities, enables income tracking, supports product and service listings, facilitates deliveries via a driver dispatch system, and is designed to work even with poor or no connectivity.

**Stack:** Spring Boot 3.x (Java 21) + Angular 18 (standalone components) + PostgreSQL, orchestrated via Docker Compose.  
**Repo:** https://github.com/Sandilem7789/hustle  
**Branch:** `main`  
**Live progress:** See `PROGRESS_UPDATE.md` for the full feature history and known gaps.

---

## Design Mandate — Mobile First

This app is used primarily on mobile devices in rural KZN. Every UI decision must prioritize the mobile experience.

- Design for a 360–430px viewport as the primary canvas; desktop is secondary
- Use bottom navigation bars, not top-heavy navbars with dropdowns
- Touch targets must be at least 48×48px
- Avoid hover-only interactions — all controls must be tappable
- Use single-column card layouts on mobile; grid only on tablet+
- Forms must use large inputs, visible labels, and native pickers where possible
- Limit the use of modals — prefer in-page flows or dedicated routes on mobile
- Images must be lazy-loaded and compressed — bandwidth in rural areas is limited
- Avoid animations that block interaction or drain battery
- All Angular components must be mobile-styled first; use `@media (min-width: ...)` for desktop overrides, never `max-width` mobile overrides

---

## Architecture

```
frontend/   — Angular 18 (standalone components, signals-based AuthService)
backend/    — Spring Boot 3.x REST API
dashboard/  — Nginx config / static serving
tests/      — Integration and E2E test suites
docker-compose.yml — PostgreSQL (5432), backend (8080), frontend (4173)
```

### Key backend packages
- `controller/` — REST endpoints (thin — no business logic)
- `service/`    — Business logic
- `entity/`     — JPA entities
- `dto/`        — Request/response DTOs (never expose entities directly)
- `mapper/`     — Entity ↔ DTO mapping
- `repository/` — Spring Data JPA repos
- `config/`     — CORS (`WebConfig`), security, data init

### CORS allowed origins (`WebConfig.java`)
- `http://localhost:4200` (Angular dev server)
- `http://localhost:4173` (Docker/Nginx)
- `http://148.230.79.29:4173`
- `http://148.230.79.29`

---

## Roles & Access

| Role | Description |
|------|-------------|
| **Hustler** | Register, log income, manage products/services, view own dashboard |
| **Customer** | Browse marketplace, create account, place orders, track deliveries |
| **Driver** | Accept delivery jobs, view map route to customer, mark delivery complete |
| **Facilitator** | Review hustler applications, approve/reject/revoke, edit business details (not phone/email) |
| **Coordinator** | *(Planned)* Edit phone/email and sensitive fields on any profile |

Auth uses session tokens (`X-Auth-Token` header, `hustler_sessions` table). Passwords are BCrypt-hashed.  
Roles are stored per user and must be checked server-side on every protected endpoint.

---

## Communities (seeded by `DataInitializer`)
KwaNgwenya, KwaNibela, KwaMakhasa, KwaJobe, KwaMnqobokazi

---

## Marketplace — Categories & Filtering

The marketplace uses **radio buttons** to switch between top-level categories. Only one category is active at a time. Community filter pills remain visible across all categories.

### Category definitions
| Category | Subcategories / Notes |
|----------|-----------------------|
| **Food** | Fast food, home-cooked meals, snacks, fresh produce |
| **Clothing** | New, second-hand, traditional/cultural wear |
| **Services** | Hair, repairs, cleaning, tutoring, transport, etc. |
| **Crafts & Art** | Handmade goods, décor, beadwork |
| **Agri & Livestock** | Vegetables, eggs, poultry, livestock |
| **Electronics** | Phones, accessories, small appliances |
| **Other** | Catch-all for listings that don't fit above |

### Delivery distance rules
- **Fast food / perishable food**: maximum delivery radius **60 km** — enforce on both backend and frontend
- **All other categories**: no distance cap (driver availability determines feasibility)
- Distance is calculated as straight-line (haversine) between seller GPS coordinates and customer delivery coordinates
- If an order exceeds the distance cap, the checkout must block and show a clear message: *"This seller cannot deliver to your location. You can collect in person."*

---

## Transaction Types — B2B vs B2C

Every order must carry a `transactionType` field:

- **B2C** (Business to Customer): a registered customer buying from a hustler for personal use
- **B2B** (Business to Business): a hustler or business account buying from another hustler (bulk, wholesale, or resupply)

Implications:
- B2B orders should display business name, VAT (if applicable), and allow purchase order reference fields
- Driver dispatch is available for both B2B and B2C
- Income logged from marketplace orders must inherit the `transactionType` for reporting

---

## Customer Checkout & Delivery Pipeline

When a logged-in customer proceeds to buy:

1. **Cart review** — items, quantities, seller name
2. **Fulfilment choice** — radio: `Delivery` or `Collection`
   - If **Delivery**: customer enters or confirms a delivery address (GPS pin on map preferred, text fallback)
   - If **Collection**: show seller's operating area / pin
3. **Distance check** — backend validates haversine distance; block if food order exceeds 60 km
4. **Payment** — (Peach Payments / Ozow / PayFast — integrated per sprint)
5. **Order confirmed** — order record created; driver dispatch triggered if delivery selected
6. **Tracking** — customer can view order status (Pending → Driver Assigned → En Route → Delivered)

Guest checkout (name + phone + address) is allowed as a fallback — collect minimal data only.

---

## Driver & Dispatch System

### Driver registration
- Drivers register separately (role = `DRIVER`)
- Required fields: name, phone, SA ID, vehicle type (Bakkie / Motorbike / Car / Bicycle), community base, licence photo upload
- Drivers are reviewed and activated by a Facilitator before they can accept jobs

### Dispatch flow
1. Order with `fulfillmentType = DELIVERY` is created
2. System finds available drivers in the same or nearest community and notifies them (push notification / WhatsApp fallback)
3. First driver to accept is assigned; order status → `DRIVER_ASSIGNED`
4. Driver dashboard shows the job queue and active delivery

### Driver dashboard (`/driver`)
- **Job queue tab**: available delivery jobs with seller name, item summary, distance, and estimated payout
- **Active delivery tab**: once a job is accepted:
  - Map view (OpenStreetMap via Leaflet — free, no API key needed for tiles) showing:
    - Driver's current GPS position (updated via browser Geolocation API)
    - Seller/pickup pin
    - Customer/delivery pin
    - Route line between the two (use OSRM public routing API or straight line if offline)
  - Customer name, phone (tap to call), delivery address
  - Delivery status buttons: `Picked Up` → `En Route` → `Delivered`
  - Signature / photo proof of delivery (image upload on completion)
- **Earnings tab**: history of completed deliveries and payouts

### Offline behaviour for drivers
- Cache last known job details in IndexedDB so drivers can view delivery info without connectivity
- Status updates queue offline and sync when connectivity returns
- Map tiles should be cached for the driver's community region at app install (PWA precache)

---

## PWA / Offline Strategy

All three dashboards (Hustler, Customer, Driver) must eventually work offline or in degraded connectivity:

| Dashboard | Offline capability |
|-----------|-------------------|
| Hustler | Log income, view products (cached); sync when online |
| Customer | View cached browsing history, view order status (cached) |
| Driver | View active delivery details + cached map tiles; queue status updates |

Implementation:
- `ng add @angular/pwa` — service worker for asset caching
- IndexedDB (via `idb` library or Angular CDK) for offline data queues
- Background sync when connectivity restored
- Show a clear "You are offline" banner but do not block the dashboard

---

## Security Requirements

- All write endpoints require a valid `X-Auth-Token` — validate server-side on every request, never trust the client
- Role-based access: check `role` on the authenticated session before executing any action
  - Hustlers cannot access `/facilitator`, `/driver`, or other hustlers' data
  - Drivers cannot access `/facilitator` or modify products/income
  - Customers cannot modify hustler or driver data
- Never expose internal IDs in error messages
- All user-uploaded images: validate MIME type and file size server-side (max 5 MB, images only)
- Delivery address and GPS coordinates are PII — do not log them to application logs
- Phone numbers must be masked in any admin list views (show last 4 digits only unless explicitly viewing a record)
- SQL injection: use Spring Data JPA / named parameters only — never string-concatenated queries
- XSS: Angular escapes by default — do not use `[innerHTML]` with user-controlled content
- HTTPS must be enforced in production (Nginx config) — redirect HTTP → HTTPS

---

## API Conventions

- Base path: `/api`
- Auth: `X-Auth-Token` header on all protected routes
- Role header is never trusted from client — derive role from the authenticated session server-side
- All responses: `{ data, message, success }` envelope (where applicable)
- Errors: `{ message, code }` — no stack traces in production responses
- Decisions on hustler applications: `PATCH /api/hustlers/{id}/decision`
- Profile edits by facilitator: `PATCH /api/hustlers/{id}/profile` — never includes `phone` or `email`
- Product limit: 40 per hustler (enforced backend + frontend)
- Income channels: `CASH`, `MARKETPLACE`
- Images: `POST /api/uploads`, served via `GET /api/uploads/{filename}`, stored in Docker volume `uploads_data`
- Distance validation: `POST /api/orders/validate-distance` — accepts seller ID + delivery coordinates, returns pass/fail + distance in km

### Planned endpoints (do not build speculatively — implement per sprint)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customers/register` | Customer account creation |
| POST | `/api/customers/login` | Customer login |
| POST | `/api/orders` | Place an order |
| GET | `/api/orders/my` | Customer order history |
| GET | `/api/orders/{id}` | Order detail |
| PATCH | `/api/orders/{id}/status` | Update order status (driver/hustler) |
| POST | `/api/drivers/register` | Driver registration |
| GET | `/api/drivers/available` | List available drivers (dispatch) |
| POST | `/api/drivers/{id}/assign` | Assign driver to order |
| GET | `/api/drivers/jobs` | Driver's job queue |
| GET | `/api/products?category=&communityId=` | Marketplace with category filter |

---

## Frontend Conventions

- Angular 18 standalone components (no NgModules)
- Signals-based `AuthService` with `localStorage` persistence
- Route guards per role — redirect to appropriate login if not authenticated
- Community pills on marketplace default to "All communities"
- Facilitator filters: status (Pending/Approved/Rejected) + community
- Maps: use **Leaflet + OpenStreetMap** (no paid API key required) for all map views
- Category selector: radio button group (not tabs, not pills) at top of marketplace page
- Bottom navigation bar for all dashboard views on mobile (icons + labels, max 5 items)

---

## Workflow Guidelines

### Git
- Commit messages: `type: short description` — types are `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- One logical change per commit — do not bundle unrelated changes
- Always push to `main` and pull after pushing to stay in sync with remote collaborators (Mesh Audio Bot)
- Before starting any new feature, pull first: `git pull origin main`

### Building features
- Read the relevant existing files before writing any new code
- Check `PROGRESS_UPDATE.md` before implementing anything in the "Planned Work" section — confirm it's the right sprint
- For any new entity: create entity → repository → service → DTO → mapper → controller in that order
- For any new Angular feature: create the service first, then the component
- Mobile layout first, then add responsive overrides for wider screens

### Testing
- New endpoints should have at least one integration test in `tests/`
- Do not add unit tests that mock the database — integration tests against the real DB are preferred
- E2E tests live in `tests/e2e/`

---

## What NOT to touch (without explicit instruction)

- `phone` and `email` on a hustler profile — Coordinator role only
- The 40-product cap — deliberate business rule
- Session token auth mechanism — do not swap to JWT without discussion
- OpenStreetMap/Leaflet choice — do not swap to Google Maps (cost/API key reasons)
- The 60 km fast-food delivery cap — deliberate safety and freshness rule
- Driver GPS coordinates and customer delivery addresses — treat as PII at all times

---

## Known Planned Work (do not implement speculatively)

Implement only when explicitly requested in the current session:

- Coordinator dashboard
- WhatsApp Business API — invoice and notification sending
- Payments: Peach Payments (primary), Ozow/Stitch EFT, PayFast prototype
- Customer accounts and checkout pipeline
- Driver registration, dispatch, and dashboard with map
- Marketplace category radio buttons and distance enforcement
- PWA + offline mode (IndexedDB + background sync + service worker)
- Barcode/QR scanner for marketplace income
- Pagination on list endpoints
- VPS/production deployment (Nginx HTTPS config)
- B2B purchase order fields and reporting

---

## Dev & Docker

```bash
# Start full stack
docker compose up --build

# Backend only (from /backend)
./mvnw spring-boot:run

# Frontend only (from /frontend)
ng serve          # localhost:4200 (dev)
ng build          # production build

# Run tests
cd tests && npm test         # integration
cd tests && npm run e2e      # end-to-end
```

Java version is pinned to **21** — do not suggest upgrading.  
Node version: use whatever is in `frontend/.nvmrc` or `package.json` engines field.

---

## Code Style

- Controllers are thin — logic belongs in services
- DTOs for all request/response bodies — never expose JPA entities to the API layer
- New endpoints follow existing REST naming conventions
- Angular: use standalone components, inject services via `inject()` consistently
- Do not add comments unless the logic is genuinely non-obvious
- Do not add error handling for impossible scenarios
- Do not create helpers or abstractions for one-time use
- Do not add features, refactors, or improvements beyond what was asked
- CSS/SCSS: mobile styles are base styles; use `min-width` media queries for desktop overrides only
