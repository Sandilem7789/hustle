# Hustle WebApp - Progress Update

## Summary
The Hustle Economy web app (Spring Boot + Angular 18, Docker Compose) is fully functional locally. All core features are live: hustler registration with auth, full facilitator applicant pipeline (Phases 1–7), hustler dashboard with income tracking and product management, community marketplace, customer checkout, and coordinator view. The most recent sprint completed the full facilitator pipeline — applicant capture through account activation, monthly check-ins, coordinator view, admin exports (CSV + Excel), rejection reason tracking, and seeding of 102 KwaNgwenya cohort-8 applicants.

---

## ✅ Completed Features (Full History)

### Infrastructure & Environment
- Docker Compose stack: PostgreSQL (5432), Spring Boot backend (8080), Angular/Nginx frontend (4173)
- Java 21 (pinned — Maven image constraint), Spring Boot 3.x, Angular 18 standalone components
- Nginx reverse-proxying `/api` to backend to avoid CORS issues in production-like setup
- Named Docker volume `uploads_data` for product image persistence

### Authentication & Registration
- Hustler registration form with password + confirm password, SA ID number ("ID no.") field, community dropdown (loaded from API), business type dropdown (Service / Product / Service & Products)
- BCrypt password hashing via `spring-security-crypto`
- Session token auth (`X-Auth-Token` header, `hustler_sessions` table)
- Login by phone number + password; status gate (PENDING/REJECTED blocked from logging in)
- Login response now includes `businessType` — stored in `AuthState` and shown as badge on dashboard
- Registration error messages are now specific (e.g. "Registration failed: Phone number already registered") instead of generic
- `AuthService` (Angular) with signal-based state, `localStorage` persistence

### Hustler Dashboard (`/dashboard`)
- Redirects to `/register` if not logged in
- **Hero banner**: gradient (yellow → teal), greeting ("Hi {firstName}!"), shop name, business type badge
- **Financial summary cards**: Income (green ↑), Expenses (red ↓), Profit (blue ≈) — each shows this-month total with icon
- **Log Income / Log Expense buttons**: large, prominent, coloured — tap to jump straight to the correct log form
- **Finances tab**: log daily income or expense (date, amount, notes); history table with week/month/all filter; period summary bar; line chart (income / expenses / profit toggleable); weekly and monthly CSV export; service invoice PDF generation
- **Products tab**:
  - Shop name badge + "✓ Approved" status badge + listing count at header
  - "+ Add Product" button opens a slide-up **modal form** (name, description, price, image upload); closes automatically on success
  - 40-product limit enforced on backend and frontend; limit banner shown when reached
  - Product grid with lazy-loaded images
  - Each product card has inline **edit** (pencil) and **delete** (✕) controls
  - Edit mode opens in-card form for name, description, price, optional image replacement
- **Orders tab**: incoming orders list with confirm/cancel actions
- **Top nav (desktop)**: shows "My Dashboard", "Facilitator", and "Logout" button when hustler is logged in

### Facilitator Queue (`/facilitator`)
- Filter by status (Pending / Approved / Rejected) and community
- Expandable application cards with full detail view
- Facilitator notes textarea per application
- Contextual action buttons: Approve, Reject, Revoke, Reconsider & Approve
- **Edit business details** button at footer of expanded view (APPROVED applications only):
  - Editable fields: Community, Operating Area, Description, Target Customers, Vision, Mission / Support needed
  - Phone and email are **not** editable by facilitators (reserved for Coordinator role — future dashboard)
  - Saves via `PATCH /api/hustlers/{id}/profile`; syncs both `HustlerApplication` and `BusinessProfile`

### Applicant Pipeline (Phase 1)
Full pre-onboarding pipeline for facilitators to capture and track applicants from paper/email forms through to approval.

**Backend:**
- New `Applicant` entity with community FK, cohort number, personal details, type of hustle, district/section
- `PipelineStage` enum: `CAPTURED → CALLING → INTERVIEW_SCHEDULED → INTERVIEWED → BUSINESS_VERIFICATION → APPROVED → REJECTED`
- `CallStatus` enum: `NOT_CALLED`, `REACHED`, `MISSED_CALL`, `VOICEMAIL`
- Age flag: auto-set `true` if applicant is outside 18–35 range
- Cohort cap enforcement: blocks `APPROVED` if cohort already has 30 approved applicants
- `ApplicantRepository` with queries by community, stage, call status, and approved count
- Full CRUD + pipeline management via `ApplicantController` / `ApplicantService`

**Frontend (Pipeline tab in Facilitator Queue):**
- New **Pipeline** tab as the default tab in the facilitator dashboard
- **Add Applicant** form: community, cohort (1 or 2), name, gender, age, phone, email, type of hustle, district/section, captured-by
- Community + cohort filter dropdowns
- **Cap progress bar**: shows `X / 30` approved per cohort with colour change when cap is reached
- Stage filter tabs (All | Captured | Calling | Interview | Evaluated | Verification | Approved | Rejected) with live count badges
- Applicant cards with orange left-border for age-flagged records
- Expand/collapse for full detail (community, cohort, gender, age warning, email, captured-by)
- **Call outcome** quick-update buttons (Not Called / Reached / Missed Call / Voicemail) — highlighted when active
- **Stage advance** button (moves to the next stage) and **Reject** button

### Interview Recording (Phase 2)
- `Interview` entity with evaluation criteria, outcome (PASS / FAIL / NO_SHOW), conducted date, notes, conducted-by
- `InterviewOutcome` enum; coordinator can schedule date via `PATCH /interview/schedule`
- Recording outcome automatically moves applicant to `INTERVIEWED` stage
- Frontend: interview form appears inside the expanded applicant card when stage = `INTERVIEW_SCHEDULED`
  - Three criteria checkboxes (large touch targets): describe business, appears genuine, has running business
  - PASS / FAIL / No Show outcome buttons
  - Once recorded: shows read-only result summary with criteria ticks in subsequent stages

### Business Verification (Phase 3)
- `BusinessVerification` entity with GPS coordinates, up to 3 photo URLs, outcome (VERIFIED / FAILED), visit date, notes, verified-by
- Photos stored via existing upload endpoint; up to 3 per verification
- GPS captured via browser Geolocation API (`Get My Location` button) **or** by tapping the map
- `MapPickerComponent` — standalone Leaflet + OpenStreetMap component; tap to drop a pin, emits coordinates; centred on Phinda area by default
- Frontend: verification form appears when stage = `BUSINESS_VERIFICATION`
  - `📍 Get My Location` button populates lat/lng and updates map pin
  - Leaflet map allows manual pin placement as fallback
  - Photo upload grid (3 slots) with thumbnail preview and remove button
  - Once recorded: shows read-only GPS coordinates + photo thumbnails on `APPROVED` stage

### Account Activation (Phase 5)
- `POST /api/applicants/{id}/activate` — creates a `HustlerApplication` (APPROVED) + `BusinessProfile` from applicant data, BCrypt-hashes a generated password, sets `activatedAt` timestamp
- Password is 8 characters from a safe character set (no ambiguous chars: 0/O/1/l/I); shown once in a modal overlay
- Frontend: "Create Account" button appears at `APPROVED` stage if not yet activated; password modal with Copy button shown once on creation

### Monthly Check-ins (Phase 6)
- `MonthlyCheckIn` entity linked to `BusinessProfile`; stores visit month (YYYY-MM), visitedBy, notes, and up to 3 photo URLs
- `missedCheckIn` flag computed per hustler on every `/api/facilitator/hustlers` response
- Frontend Hustlers tab: orange "No visit" badge on cards, Check-in sub-tab per hustler
  - Records a visit for the current month with notes + photos
  - Shows full visit history (oldest visit → newest)
  - Missed-visit warning banner when no check-in exists for the current month

### Coordinator View (Phase 7)
- `CoordinatorPageComponent` at `/coordinator` — wraps the facilitator queue with `[coordinatorMode]="true"`
- Teal coordinator banner at the top of the page
- `coordinatorMode` input on `FacilitatorQueueComponent`:
  - Pipeline defaults to showing all communities (no community pre-selected)
  - **Schedule Interview** button visible on `CAPTURED`/`CALLING` applicants (coordinator-only)
  - Scheduling sets `scheduledDate` via `PATCH /api/applicants/{id}/interview/schedule` and advances stage to `INTERVIEW_SCHEDULED`

### Rejection Reason & Reinstate
- Rejection now opens an inline form with preset reasons including "Previously included in another cohort"
- "Other" selection reveals a free-text textarea
- Rejection reason stored on `Applicant` entity and returned in API response
- Rejected applicants show the stored reason + a **Reinstate** button that sets stage back to `CAPTURED` and clears the reason

### Admin Exports Tab (replaces Drivers tab)
- Drivers tab removed from both frontend and backend (driver services are offered by hustlers — no separate driver role in pipeline)
- New **Exports** tab with 5 export cards, each offering two download buttons side by side:
  - **↓ CSV** (plain text, opens in any spreadsheet app)
  - **↓ Excel** (`.xlsx` via SheetJS, auto-sized columns, opens natively in Excel/LibreOffice)
- Export reports: Interview Shortlist, Approved Applicants, Full Pipeline, Monthly Visit Report, Active Hustlers
- All exports respect the active community/cohort filter; filenames include cohort number and month

### KwaNgwenya Applicant Seeding
- `DataInitializer` seeds 102 cohort-8 KwaNgwenya applicants on first startup (idempotent — skipped if any applicants already exist for the community)
- Data sourced from community intake CSV; call status mapped to `CallStatus` enum; age flags auto-set outside 18–35 range
- `capturedBy` set to "Sandile Mathenjwa" for all seeded records
- Pipeline cohort filter defaults to cohort 8; "Add Applicant" form defaults new applicants to cohort 8

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
| POST | `/api/applicants` | Capture new applicant |
| GET | `/api/applicants?communityId=&stage=&callStatus=` | List applicants with filters |
| GET | `/api/applicants/{id}` | Get single applicant |
| PATCH | `/api/applicants/{id}/call` | Update call status |
| PATCH | `/api/applicants/{id}/stage` | Advance or set pipeline stage |
| GET | `/api/applicants/{id}/interview` | Get interview record |
| PATCH | `/api/applicants/{id}/interview/schedule` | Set scheduled interview date (coordinator) |
| POST | `/api/applicants/{id}/interview` | Record interview outcome |
| GET | `/api/applicants/{id}/verification` | Get business verification record |
| POST | `/api/applicants/{id}/verification` | Record business verification (GPS + photos) |
| GET | `/api/applicants/cap-status?communityId=&cohortNumber=` | Approved count vs 30 cap |
| POST | `/api/applicants/{id}/activate` | Create hustler account from approved applicant (password shown once) |
| GET | `/api/facilitator/hustlers/{id}/checkins` | List monthly check-ins for a hustler |
| POST | `/api/facilitator/hustlers/{id}/checkins` | Record monthly check-in (upserts for current month) |
| GET | `/api/facilitator/hustlers` | List all active hustlers with month financials + missed check-in flag |
| PATCH | `/api/facilitator/hustlers/{id}/active` | Toggle hustler active/inactive |

---

## 🔧 Known Gaps & Planned Work

| Item | Notes |
|------|-------|
| **Coordinator phone/email edit** | Coordinator can now view all communities and schedule interviews. Editing phone/email (login credentials) for hustlers is the remaining coordinator-only action — planned when coordinator auth is implemented. |
| **WhatsApp integration** | Send invoices and notifications directly to customers via WhatsApp Business API. Planned once API integration approach is decided. Invoice PDF generation is already in place — the send-to-customer button will be wired up when WhatsApp is ready. |
| **Payments & payouts roadmap** | Adopt Peach Payments as the primary gateway (split settlements, wallets) and pair with Ozow/Stitch for instant EFT. Start by prototyping on PayFast if needed, then migrate checkout + automated payouts once underwriting is approved. |
| **Marketplace purchase flow** | Add buyer-side actions: start with CTA or guest checkout (collect name/phone/address per order), then graduate to full customer accounts with carts/order history once logistics + payments are ready. |
| **PWA / offline hustler mode** | Convert the Angular app to a PWA (`ng add @angular/pwa`), cache the hustler dashboard, store offline income entries/products in IndexedDB, and sync via background tasks so logging works without connectivity. |
| **Barcode / marketplace scanner** | Marketplace channel income (products sold via the platform) will be tracked automatically once a barcode/QR scan flow is built. Currently all income is captured as cash. |
| **Automated tests & CI** | Backend integration tests + Playwright e2e specs exist in the repo, but they aren’t being run anywhere. Execute them locally, capture the results in `tests/TEST_RESULTS.md`, and add a GitHub Action so every PR runs both suites. |
| **Role-aware auth** | Coordinator-only actions (interview scheduling, applicant reinstatement, sensitive edits) currently sit behind shared facilitator auth. Introduce coordinator accounts + JWT/session claims and gate the Angular routes/components accordingly. |
| **Pagination** | All list endpoints return full result sets. Add if dataset grows large. |
| **VPS deployment** | Currently running on localhost only. Docker Compose is production-ready once pointed at a server. |

---

## Next Sprint Focus — 2026-04-20 13:00 SAST

1. **Testing & CI pass** — run `mvn test -Dtest=IncomeServiceIntegrationTest,FacilitatorServiceIntegrationTest` and `npm run test:e2e`, capture the output in `tests/TEST_RESULTS.md`, and wire a GitHub Action so regressions are caught automatically.
2. **Role-aware auth** — add coordinator roles/claims and lock privileged facilitator/coordinator UI controls behind those roles so public routes don’t expose scheduling or applicant reinstatement.
3. **Customer purchase MVP** — ship the guest-checkout CTA flow on the marketplace so hustlers/facilitators receive structured orders (name, phone, drop-off notes) even before payments land.
4. **PWA/offline sprint** — finish `@angular/pwa`, cache the hustler dashboard shell, and pipe income/product mutations through `offline-queue.service.ts` so hustlers can log data while offline.
5. **Docs + onboarding sync** — update README + PROGRESS with the new facilitator pipeline, brand system, and testing story so new contributors land on accurate instructions.

## Recent Commits (April 2026)

| Commit | Description |
|--------|-------------|
| *(pending)* | feat: facilitator pipeline phases 1–7, exports tab, rejection reason, KwaNgwenya seeding |
| `97b6a29` | feat: brand design overhaul — styles, logo, and tailwind config updates |
| `378f15a` | fix: logo not loading and docker-compose version warning |
| `ee1c714` | feat: complete brand design overhaul across all dashboards and pages |
| `e22c6f6` | feat: redesign hustler dashboard UI with hero banner, financial cards, and product modal |
| `012b754` | feat: implement phases 1-5 — marketplace, customers, orders, drivers, offline |

---

**Last Updated**: 2026-04-20
**Branch**: `main`
**Repo**: https://github.com/Sandilem7789/hustle

## MVP Launch Plan — KwaZulu-Natal Pilot

1. **Target audience lock-in** — limit the initial release to the five seeded KZN communities (KwaNgwenya, KwaNibela, KwaMakhasa, KwaJobe, KwaMnqobokazi) and issue invite-only facilitator links so only verified hustlers access the dashboard during the MVP window.
2. **Crash & analytics instrumentation** — prep Sentry/Firebase Crashlytics for both Angular (client) and Spring Boot (API) with community/role context plus sampling tuned for a small cohort. Wire alerts to a private Discord/Telegram channel so critical errors page us immediately.
3. **Feedback loop** — add an in-app “Report an issue” button that posts to a triage inbox (Notion, Firestore, etc.), and back it up with facilitator-managed WhatsApp/phone channels so hustlers can send voice notes or photos when connectivity is weak.
4. **Expansion runway** — define MVP success metrics in KZN (DAU, crash-free sessions, income logs) and document the onboarding data that must change per region so we can replicate the rollout in Mpumalanga once KPIs are hit.
