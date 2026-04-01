# Hustle WebApp - Progress Update

## Summary
The Hustle Economy web app (Spring Boot + Angular 18, Docker Compose) is fully functional locally. All core features are live: hustler registration with auth, facilitator review queue, hustler dashboard with income tracking and product management, and a community marketplace. The most recent sprint added marketplace product browsing, inline product editing from the hustler dashboard, and facilitator-side business profile editing for approved hustlers.

---

## ✅ Completed Features (Full History)

### Infrastructure & Environment
- Docker Compose stack: PostgreSQL (5432), Spring Boot backend (8080), Angular/Nginx frontend (4173)
- Java 21 (pinned — Maven image constraint), Spring Boot 3.x, Angular 18 standalone components
- Nginx reverse-proxying `/api` to backend to avoid CORS issues in production-like setup
- Named Docker volume `uploads_data` for product image persistence

### Authentication & Registration
- Hustler registration form with password + confirm password, SA ID number field, community dropdown (loaded from API), business type dropdown (Service / Product / Service & Products)
- BCrypt password hashing via `spring-security-crypto`
- Session token auth (`X-Auth-Token` header, `hustler_sessions` table)
- Login by phone number + password; status gate (PENDING/REJECTED blocked from logging in)
- `AuthService` (Angular) with signal-based state, `localStorage` persistence

### Hustler Dashboard (`/dashboard`)
- Redirects to `/register` if not logged in
- **Income tab**: log daily income (date, amount, channel, notes); summary chips (today / this week / this month); CSS bar chart (cash vs marketplace split); history table with week/month/all filter; weekly and monthly CSV export
- **Products tab**:
  - Shop name badge + listing count (`BusinessName — X / 40 listings`) at top of products container
  - Add product form (name, description, price, image upload)
  - 40-product limit enforced on backend and frontend
  - Each product card has inline **edit** (pencil) and **delete** (✕) controls
  - Edit mode opens in-card form for name, description, price, optional image replacement — saves via `PATCH /api/products/{id}`

### Facilitator Queue (`/facilitator`)
- Filter by status (Pending / Approved / Rejected) and community
- Expandable application cards with full detail view
- Facilitator notes textarea per application
- Contextual action buttons: Approve, Reject, Revoke, Reconsider & Approve
- **Edit business details** button at footer of expanded view (APPROVED applications only):
  - Editable fields: Community, Operating Area, Description, Target Customers, Vision, Mission / Support needed
  - Phone and email are **not** editable by facilitators (reserved for Coordinator role — future dashboard)
  - Saves via `PATCH /api/hustlers/{id}/profile`; syncs both `HustlerApplication` and `BusinessProfile`

### Marketplace (`/`)
- Community filter pill bar: **All communities** (default) + one pill per seeded community
- Loads products via `GET /api/products?communityId=...` (no communityId = all)
- Product cards: image, product name, shop name (business), description (2-line clamp), price
- Read-only — no edit or delete controls

### Community Seeding
- `DataInitializer` seeds 5 KwaZulu-Natal communities on startup: KwaNgwenya, KwaNibela, KwaMakhasa, KwaJobe, KwaMnqobokazi

### Backend API Summary
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login by phone + password |
| POST | `/api/hustlers` | Submit application |
| GET | `/api/hustlers?status=&communityId=` | List applications (facilitator) |
| PATCH | `/api/hustlers/{id}/decision` | Approve / Reject |
| PATCH | `/api/hustlers/{id}/profile` | Edit business details (facilitator) |
| GET | `/api/communities` | List all communities |
| POST | `/api/products` | Add product (auth required) |
| GET | `/api/products/my` | List own products (auth required) |
| PATCH | `/api/products/{id}` | Update product (auth required) |
| DELETE | `/api/products/{id}` | Delete product (auth required) |
| GET | `/api/products?communityId=` | Public product listing |
| POST | `/api/uploads` | Upload image (auth required) |
| GET | `/api/uploads/{filename}` | Serve uploaded image |
| POST | `/api/income` | Log income entry (auth required) |
| GET | `/api/income/my` | List own income (auth required) |
| GET | `/api/income/summary` | Income summary today/week/month |
| GET | `/api/income/export?period=` | CSV export |

---

## 🔧 Known Gaps & Planned Work

| Item | Notes |
|------|-------|
| **Coordinator dashboard** | Separate role; can edit phone/email (login credentials) and other sensitive fields. Planned for a future sprint. |
| **Unit / integration tests** | 0 tests currently. Should be added post-MVP. |
| **Pagination** | All list endpoints return full result sets. Add if dataset grows large. |
| **VPS deployment** | Currently running on localhost only. Docker Compose is production-ready once pointed at a server. |

---

## Recent Commits (April 2026)

| Commit | Description |
|--------|-------------|
| `6d75748` | feat: marketplace product browsing, editable product cards, facilitator profile editing |
| `bc93b98` | feat: community seeding, income ledger, upgraded dashboards (MeshCode plan) |
| `67f5fa5` | fix: login crash when same phone registered multiple times |
| `a1a3071` | fix: lazy-load crash on approve/reject decision endpoint |
| `c8a53af` | fix: CORS blocking PATCH, login error messages, rejected app access |

---

**Last Updated**: 2026-04-01
**Branch**: `main`
**Repo**: https://github.com/Sandilem7789/hustle
