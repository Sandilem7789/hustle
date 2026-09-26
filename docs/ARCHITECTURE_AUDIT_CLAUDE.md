# Architecture Audit — Backend & Frontend (Sandile.Claude, 2026-09-26)

Full-stack structural review across all documented layers (backend: controller → service → entity → DTO → mapper → repository → config; frontend: services → components/pages → state → routing), checked against the conventions in `CLAUDE.md`. Two independent passes (one per side of the stack), every finding verified by reading the actual code — no speculative items, and nothing from the "Known Planned Work" list is treated as a gap.

Legend: **[High]** correctness/security bug with real user impact · **[Medium]** real but lower-blast-radius · **[Low]** style/cleanup.

Items marked **✅ Fixed (this pass)** were small, unambiguous, no-design-tradeoff fixes applied directly. Everything else is handed to Sandile.Codex via `CODE_REVIEWS.md` for the normal review flow, since it either involves a design decision or has enough surface area to warrant a diff + review rather than a drive-by fix.

---

## Backend

### Controllers
Nearly every controller correctly delegates to a service and role-checks via `authService.requireRole(...)` before touching data. Two controllers broke the pattern.

- **[High] ✅ Fixed** `CommunityController.createCommunity()` had **no auth/role check at all** — any unauthenticated caller could create arbitrary communities. Added `authService.requireRole(token, FACILITATOR, COORDINATOR)`, matching every other admin-style write endpoint in the codebase. No frontend caller exists for this endpoint (only `GET` is used), so zero blast radius.
- **[High]** `OperationsController.stats()` injects three repositories directly and builds aggregation logic inline — no service layer. Move to an `OperationsService`.
- **[Medium]** `CommunityController` returns raw JPA entities (`Community`, `BusinessProfile`) instead of DTOs — the only controller doing this. Combined with `open-in-view=false` and no Hibernate-Jackson module, `GET /api/communities/{id}/hustlers` is a live `LazyInitializationException` risk on the `community` field.
- **[Low]** `OrderController`/`FacilitatorController` parse raw `Map<String,String>`/enum bodies instead of typed `@Valid` DTOs — inconsistent with the rest of the codebase.

### Services
Ownership checks are generally solid (Product/Sale/Order all verify the caller's business ID) — two real access-control gaps stood out.

- **[High] ✅ Fixed** `NotificationService.markRead()` never checked the notification's owner — any authenticated hustler could mark **any other hustler's** notification read by guessing a UUID (IDOR). Now takes the caller's business-profile ID and throws 403 on mismatch, mirroring the ownership pattern used elsewhere.
- **[Medium]** `IncomeService.updateIncome()` ignores the `businessProfileId` path variable entirely — no verification the income entry belongs to that hustler. Scoped to FACILITATOR/COORDINATOR callers, so lower severity, but still an unchecked cross-tenant write path.
- **[Medium]** `OrderService` uses raw `RuntimeException` in two places instead of the `ResponseStatusException` pattern used everywhere else — surfaces as an uncontrolled 500, not a proper 4xx.
- **[Medium]** `DispatchService.listOpenJobs(driverCommunityId)` takes a community filter and **never uses it** — any driver sees/can accept jobs nationwide, contradicting the documented "drivers in the same or nearest community" dispatch flow.
- **[Low]** `FacilitatorService`/`ApplicantService` run a manual per-row query inside a `.map()` over hustler/applicant lists — N+1 on `/api/facilitator/hustlers` and `/api/applicants`.

### Entities / DTOs / Mappers
DTO discipline is good everywhere except `CommunityController` (above). Only 2 dedicated mapper classes exist for ~30 entities; the rest map inline via private `toResponse` methods in services — consistent enough not to flag broadly, but a candidate for normalizing later.

- **[High]** Phone masking is documented as a hard rule but is **not implemented** on the two facilitator/coordinator list endpoints that expose it (`ApplicantResponse` via `ApplicantService.toResponse`, and `HustlerApplicationMapper`) — raw phone numbers ship unmasked. The only place masking actually exists is `DispatchService.maskPhone` (driver's view of the customer).

### Repositories
The `JOIN FETCH` pattern is applied well in most list queries (`ProductRepository`, `ApplicantRepository`, `HustlerApplicationRepository`, `BusinessProfileRepository.findAllApprovedFetched`) but is missing exactly where it matters most.

- **[High]** `OrderRepository`'s `findByCustomer_Id...`/`findByHustlerProfile_Id...` have no `JOIN FETCH`, yet both associations are lazy and `Order.items` is eager — every row on `/api/orders/my` and `/api/orders/incoming` (the two most-polled dashboard endpoints) costs 3 round trips instead of 1.

### Security / Config
- **[Medium]** No `@ControllerAdvice`/`@RestControllerAdvice` exists anywhere — error responses rely on Spring's default handling, which does not produce the documented `{message, code}` envelope. Combined with the raw-`RuntimeException` finding above, error shape and status code are inconsistent across endpoints.
- **[Low]** Upload MIME validation trusts the client's `Content-Type` header only, no content-sniffing. Configured max upload size is 10MB in `application.properties` vs. the 5MB documented in `CLAUDE.md` — needs reconciling one way or the other.
- **[Low]** CORS origins include two entries (`https://148.230.79.29`, `https://hustleconomy.netlify.app`) not listed in `CLAUDE.md`'s documented allow-list — not wrong, just a doc-sync gap.

### Legacy auth-path note
The documented `AppUser → Customer → HustlerApplication` fallback chain is implemented cleanly. What's drifted: it's no longer really "dual" — it's **five** parallel session mechanisms live at once (`AppUserSession`, legacy `HustlerSession` still checked as a fallback in `AuthService.requireAuth()`, `CustomerAuthService`, and a fully independent `DriverAuthService`/`X-Driver-Token` that was never folded into `AppUser` despite `AppUserRole.DRIVER` existing as if it should have been). No duplicated business logic, but role/session resolution is now spread across four services with no shared abstraction. Flagged for Sandile's direction, not touched — `CLAUDE.md` explicitly reserves auth-mechanism changes for discussion first.

---

## Frontend

### Signal Reactivity
- **[High]** Same bug class as the just-fixed marketplace search, found live in the hustler dashboard's POS search: `posSearchQuery` was a plain field read inside three `computed()` blocks (`posFilteredProducts`, `posVisibleProducts`, `posHasMoreProducts`) — typing in the "Search or scan" box never re-filtered the product list. **✅ Fixed this pass**, same treatment as `community-hub.component.ts`: converted to `signal('')`, updated the `[ngModel]`/`(ngModelChange)` binding and every read site.
- No other `computed()` in the codebase (16 files checked) reads a non-signal field — this pattern is now fully clear elsewhere.

### Auth Gating
- **[High]** `checkout-page.component.ts` and `customer-orders-page.component.ts` don't use `LoginGateComponent` — they show a bare card with a `routerLink` that navigates the user away to `/login`, a full-page redirect that drops in-page context, exactly what the `LoginGateComponent` pattern exists to avoid.
- **[Medium]** `driver-dashboard-page.component.ts` has the same bare-redirect pattern, but is self-documented in `app.routes.ts` as intentional ("keeps its own auth for now") — lower severity.
- **[Low] ✅ Fixed** `guards/hustler.guard.ts`, `facilitator.guard.ts`, `coordinator.guard.ts` were fully dead — `app.routes.ts` has zero `canActivate` usage, and they read the legacy single-role `AuthService.state().role`, stale relative to `UnifiedAuthService`'s multi-role model. Deleted all three.
- Positive: the actual staff pages (facilitator, coordinator, operations, notifications, hustler-dashboard) consistently use `LoginGateComponent` gated by a role-aware `computed()` — role enforcement itself is sound where the component is used.

### State Management
- **[Medium]** Auth state lives in four parallel signal stores. `UnifiedAuthService` bridges into legacy `AuthService` and `CustomerAuthService` on every login/load, but `DriverAuthService` is entirely unbridged — a user holding a driver role plus another role has two unsynced auth states. The three legacy services are near-identical copy-pasted signal/localStorage wrappers that could collapse into one generic service parameterized by storage key + shape. Mirrors the backend's auth-session sprawl finding above — same root cause, both sides of the stack.

### Service Layer / Type Safety
Generally healthy — no component injects `HttpClient` directly; all HTTP goes through `ApiService` or the auth services, and `ApiService` centralizes ~60 typed endpoints with dedicated request/response interfaces. This is the strongest part of the frontend.
- **[Low]** `OfflineQueueService.payload` is typed `any`, the one place loose typing crosses the API boundary — should be a discriminated union since both concrete payload shapes (income entry, driver status) are already typed elsewhere.

### Error Handling
Of 93 `.subscribe(...)` calls, roughly half (45) have an error handler that does nothing user-visible beyond flipping a loading flag — concentrated in `facilitator-queue.component.ts` and `hustler-dashboard-page.component.ts`.
- **[Medium]** `customer-orders-page.component.ts` — an order-history fetch failure silently shows the same empty state as "you have no orders," indistinguishable from an actual empty history.
- Positive: the highest-stakes flows (placing an order, delivery status transitions) do capture and surface errors — the swallowing is concentrated in lower-stakes list views.

### Dead Code
- **[Low]** `OfflineQueueService.enqueue()`/`processQueue()` are never called from anywhere — only `getQueue()` is used, purely to display a count that can never become non-zero. The offline-queue scaffold is non-functional today, not just "not yet built" per the PWA roadmap — worth deleting or wiring up rather than leaving UI that implies a working feature.
- No NgModule-based code anywhere — standalone-only convention fully honored.

### CSS Convention
27 `@media (max-width: …)` rules exist across 7 files; most are acceptable padding tweaks, but two are a clear mandate violation.
- **[High]** `business-page.component.ts` and `hustler-dashboard-page.component.ts` — `.product-grid`/`.product-list` base rules default to multi-column with a `max-width: 600px` override collapsing to single-column. Per `CLAUDE.md` this must be inverted: mobile-first single-column base, `min-width` query adds columns for tablet+.
- **[Medium]** `facilitator-queue.component.ts` — same backwards pattern on `.detail-grid`/`.edit-grid`, lower severity since it's a staff-only page already outside documented mobile-parity scope, but the base-CSS-direction rule still applies.

### Other
- Component duplication (product card built 3 different ways) is confirmed still current — not new, already tracked from the prior UI/UX audit.
- Only one `[innerHTML]`-adjacent usage in the app (`operations-page.component.ts`, a Leaflet popup built from an API-sourced community name, not raw user input) — low exploitability, worth a one-line hardening note but not urgent.
- API base URL resolution lives in exactly one place (`api.service.ts`) — no duplicated base-URL logic anywhere.

---

## Fixed this pass (commits follow)
1. `CommunityController.createCommunity()` — added missing role check.
2. `NotificationService.markRead()` — fixed IDOR, now ownership-checked.
3. `hustler-dashboard-page.component.ts` — POS search reactivity bug (same fix pattern as the marketplace search fix).
4. Deleted 3 dead route guard files.

## Handed to Sandile.Codex (see `CODE_REVIEWS.md`)
- Backend: `OperationsController` business-logic extraction, `CommunityController` DTO conversion, `IncomeService` ownership check, `OrderService` exception consistency, `DispatchService` community-filter bug, `OrderRepository` N+1 fix, phone masking on applicant/hustler-application list endpoints, global `@ControllerAdvice`, upload size-limit doc/config reconciliation.
- Frontend: checkout/customer-orders auth-gating conversion to `LoginGateComponent`, `OfflineQueueService` dead-code cleanup, `.product-grid` mobile-first CSS inversion in business/hustler-dashboard/facilitator-queue.
- Flagged for Sandile's direction, not assigned yet: consolidating the five-way (backend) / four-way (frontend) auth-session sprawl — this is an auth-mechanism change and `CLAUDE.md` reserves that for explicit discussion first.
