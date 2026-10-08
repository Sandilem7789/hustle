# thenga.com platform plan: from programme tool to e-commerce platform

**Status:** decided by Sandile 2026-10-09, plan written by Sandile.Claude. This file is the source of truth for the work below; `CODE_REVIEWS.md` carries the per-task review trail.

**Readers:** Sandile, Sandile.Claude, Sandile.Codex. Read `CONTEXT.md` first for the company and product story; this file turns that story into decisions and tasks.

---

## 1. What changed

thenga.com started as a tool for running the Hustle Economy Programme: facilitators captured applicants, called them, interviewed them, visited their businesses, ran monthly check-ins and assigned surveys. That structure still shapes the code.

thenga.com is now an **e-commerce platform for people who want to sell online**, with a learning layer for merchants. Programme processes are not carried over by default. Each one is kept, transformed or retired below.

---

## 2. Decisions

| # | Decision |
|---|---|
| **D1** | thenga.com is an e-commerce platform. Hustle Economy programme processes are only kept where section 4 says so. |
| **D2** | Final role names: **Merchant**, **Community Agent**, **Hub Coordinator**, plus **Platform Admin** (Sandile / Ingwenya Digital). Every account can buy, so "Buyer" is not a separate role. These replace Hustler, Facilitator and Coordinator everywhere users see them and in the role enums. Java package `com.hustle.economy` and table names stay as the internal codename. |
| **D3** | **One account per person, identified by phone number.** Phone is the login and must be unique. **Email is optional**, can be added later, and is used for account recovery, as a second security factor, and as a backup communication channel. |
| **D4** | **One account, two modes: Shopping and Selling.** Every account starts in Shopping. An approved Merchant can switch to Selling from the hamburger menu. |
| **D5** | **Becoming a merchant:** anyone opens the hamburger menu, taps "Sell on thenga.com" and applies. A **Community Agent** then verifies them in **one verification step** that covers both the interview conversation and the check that the business is real (location, photos, notes, outcome). Approval turns the account into a Merchant. This replaces the programme's five-stage pipeline. The verifier is the Community Agent, the role that replaces the programme facilitator (confirmed 2026-10-09). *(Interpretation recorded by Sandile.Claude: "retire interviews" means retire the separate scheduled interview stage, not the conversation itself.)* |
| **D6** | **Four sections in one Angular app**, each with its own navigation, each loaded only when opened: **Shop** (`/`), **Sell** (`/sell`), **Drive** (`/drive`), **Back office** (`/ops`). Community Agent tools are extra tabs inside Sell, because an agent is a merchant with more powers. |
| **D7** | **Transaction type is decided by the server from where the purchase happens**, never chosen by the buyer. Buying in Shop is B2C. Buying stock from inside Sell ("Restock") is B2B, tied to the buyer's own shop. A merchant cannot buy from their own shop. The B2C/B2B choice on checkout is removed. |
| **D8** | Build order: backend foundation, then frontend restructure, then Shop, then Sell, then Drive, then Back office. |
| **D9** | **Drivers are a role of their own** (`DRIVER`) on the same phone account. A driver is a service provider: they sell delivery to merchants on the platform. Drivers get their own **Drive** section: a queue of jobs they can take next, and for the job they are doing, a GPS route to the seller for collection, to the buyer for delivery, and to any stop in between. A Community Agent verifies drivers before they can take jobs, as `CLAUDE.md` already required of facilitators. |
| **D10** | **Need to know, for drivers.** A driver sees only what the current step of their own job requires: open jobs near them with no buyer details; after accepting, the collection point; the buyer's name, phone and drop-off point only once the parcel is collected; nothing about a job once it is complete. Drivers never see other drivers' jobs, merchants' sales, or anything else in the system. The server enforces this; hiding it in the screen is not enough. |
| **D11** | **Sellers and drivers must be 18 or older.** |
| **D12** | **Community Agents verify applicants in the areas closest to where they live.** An agent records a home location, and applications are offered to the nearest agents. |
| **D13** | **Paid Community Agent work is out of scope for now.** `docs/FACILITATOR_SELLER_SPEC.md` stays a design on the shelf. |

### Open questions for Sandile

These do not block Phase 0 or Phase 1. Each blocks the phase noted.

| # | Question | Blocks |
|---|---|---|
| ~~O1~~ | ~~Drivers~~ | Answered by D9 and D10 |
| **O2** | Age is answered (D11). Still open: must a seller already run a business, or can someone start one on thenga.com? | Phase 1.5 |
| **O3** | Programme data: 102 seeded cohort-8 applicants, interview records, monthly check-ins. Keep read-only for funder reports, export and archive, or delete? | Phase 1.3 |
| **O4** | Agent area is answered (D12). Still open: is a Hub Coordinator's area a fixed set of communities? | Phase 6 |
| ~~O5~~ | ~~Agent pay~~ | Answered by D13 |
| **O6** | Who pays the driver, and how is the delivery fee set? The buyer at checkout, the merchant, or split? Per job, per kilometre, or a flat fee per zone (the zone tariff decided for parcels in DL-1)? | Phase 1.6, Phase 5 |
| **O7** | After a Community Agent verifies an applicant, who presses Approve: the same agent, or a Hub Coordinator? A second person is safer, especially if agents are ever paid per onboarded merchant (D13). | Phase 1.5 |

---

## 3. The four sections

| Section | Who | Main jobs | Mobile bottom nav (draft) |
|---|---|---|---|
| **Shop** `/` | Everyone, logged in or not | Browse, search, view a merchant's shop, buy, pay, track orders | Shop, Search, Orders, Account |
| **Sell** `/sell` | Merchants; Community Agents see extra tabs | Today's summary, incoming orders, products, point of sale, money in and out, learning | Today, Orders, Products, Learn, More |
| **Drive** `/drive` | Drivers | Jobs I can take next, my current job with its route and steps (collected, en route, delivered, proof of delivery), my earnings | Jobs, Current, Earnings |
| **Back office** `/ops` | Hub Coordinators, Platform Admin | Merchant and driver approvals oversight, agent management, disputes, area reports and map | Desktop first is acceptable |

The hamburger menu is shared: language, theme, "Sell on thenga.com" (or "Switch to Selling" for merchants), "Drive for thenga.com" (or "Switch to Driving" for drivers), account, sign out.

---

## 4. Keep, transform, retire

### Screens

| Today | Decision | Becomes |
|---|---|---|
| `/marketplace` | Keep | Shop home |
| `/business/:id` | Keep | Shop: a merchant's shop page |
| `/checkout` | Transform | Shop checkout without the B2C/B2B choice (D7) |
| `/orders` | Keep | Shop: my orders |
| `/login` | Transform | One phone-first sign-in and sign-up for everyone (D3) |
| `/apply` | Transform | "Sell on thenga.com" application, opened from the hamburger menu (D5) |
| `/dashboard` (hustler) | Transform | Sell: Today, Orders, Products, Point of sale, Money |
| `/surveys/:id` | Transform | Sell: Learn, as quizzes |
| `/notifications` | Keep | Shared |
| `/facilitator` | Transform | Sell: agent tabs (verification queue, my verifications) |
| `/coordinator` | Transform | Back office: Hub Coordinator view |
| `/operations` | Transform | Back office: area reports and map |
| `/driver` | Transform | Drive: job queue, current job with route, earnings (D9, D10) |
| `/driver/register` | Transform | "Drive for thenga.com" application from the hamburger menu, verified by a Community Agent |
| `/driver/login` | Retire | One sign-in for everyone (D3) |

### Backend

| Today | Decision | Notes |
|---|---|---|
| `AppUser`, `AppUserSession`, `UnifiedAuthService`, `/api/auth` | Keep | Becomes the only identity and the only session |
| `Customer`, `CustomerSession`, `X-Customer-Token` | Retire | Migrate into `AppUser` (Phase 1.3) |
| `HustlerSession`, the fallback in `AuthService.requireAuth()` | Retire | |
| `DriverSession`, `X-Driver-Token`, `DriverAuthService` | Retire | Drivers sign in like everyone else (D3) |
| `Driver` | Transform | Driver details (vehicle, licence, verification, home area) attached to an `AppUser` with the `DRIVER` role (D9) |
| `HustlerApplication`, `/api/hustlers` | Transform | Merchant application |
| `Applicant`, `PipelineStage`, `CallStatus`, `Interview`, `InterviewOutcome`, `/api/applicants` | Retire | Interview conversation folds into verification (D5). Existing data per O3 |
| `BusinessVerification`, `VerificationOutcome` | Keep | The trust layer, now run by a Community Agent |
| `MonthlyCheckIn` | Retire | Existing data per O3 |
| `FacilitatorController` | Transform | Community Agent endpoints |
| `BusinessProfile` | Keep | Becomes the merchant's shop, owned by an `AppUser` through a real link (D3) |
| `Product`, `Order`, `OrderItem`, `Sale`, `Upload`, `Community`, `Notification` | Keep | Orders gain the buyer's account and optional buyer shop (D7) |
| `IncomeEntry`, `/api/income` | Transform | The financial diary becomes the merchant's money tracking |
| Survey engine (`SurveyTemplate`, `SurveyQuestion`, `SurveyAssignment`, `SurveyAnswer`) | Transform | Learning quizzes built from the 24 programme topics |
| SROI (today a spreadsheet process outside the app) | Transform | A community spend figure in Sell: how much of a merchant's buying stays in the community |
| `OperationsController` | Transform | Back office reports |
| `DeliveryJob`, `/api/drivers` | Keep, transform | Job queue and status flow stay; access rules rebuilt for need to know (D10) |
| `UserRole` and `AppUserRole` enums | Transform | One enum with the D2 names |

---

## 5. Phases and tasks

Owner key: **C** = Sandile.Claude, **X** = Sandile.Codex. Size: S, M, L. Every code task follows `CLAUDE.md` (pull `development` first, one logical change per commit, `PROGRESS_UPDATE.md` updated on completion, integration test for new or changed endpoints).

### Phase 0: decisions and requirements

| ID | Task | Owner | Size | Done when |
|---|---|---|---|---|
| P0.1 | This plan; update `CONTEXT.md`, `CLAUDE.md`, `PROGRESS_UPDATE.md` | C | S | Committed (this change) |
| P0.2 | Requirements for all four sections (brief in section 6) | X | L | Reviewed and accepted by Claude in `CODE_REVIEWS.md` |
| P0.3 | Answers to the open questions | Sandile | | Recorded in section 2 |

P0.2 gates Phases 2 to 6. It does not gate Phase 1.

### Phase 1: backend foundation (Claude only)

Login, identity and data migration are high risk, so Claude owns all of Phase 1. **Codex must not edit these files while Phase 1 is open:** `AppUser*`, `UnifiedAuthService`, `AuthService`, `CustomerAuthService`, `DriverAuthService`, `Driver*`, `DeliveryJob*`, `DispatchService`, any `*Session*` entity or repository, `BusinessProfile`, `UserRole`, `AppUserRole`, `HustlerApplication*`, and Flyway migrations.

| ID | Task | Size | Done when |
|---|---|---|---|
| P1.0 | Introduce Flyway with a baseline of the current production schema. Prerequisite already recorded in DL-1, because production runs `ddl-auto=update`, which cannot safely migrate identities. | M | App boots on a copy of the production schema with zero unexpected changes |
| P1.1 | Account model: `AppUser` is the only identity; phone unique and required; email optional and unique when present; `BusinessProfile` gets an owning `AppUser` link; one role enum with `MERCHANT`, `DRIVER`, `COMMUNITY_AGENT`, `HUB_COORDINATOR`, `PLATFORM_ADMIN`; date of birth captured for the 18+ rule (D11); agents and drivers record a home location (D12) | L | Integration tests: sign-up by phone, duplicate phone rejected, optional email, one account owns at most one shop |
| P1.2 | One session and one token. Retire the customer, hustler and driver session paths behind a short compatibility window so the live frontend keeps working during the switch. | L | Every protected endpoint authenticates through one path; old tokens rejected after the window |
| P1.3 | Data migration: existing customers, hustler applications and drivers into `AppUser`; HUSTLER to MERCHANT, FACILITATOR to COMMUNITY_AGENT, COORDINATOR to HUB_COORDINATOR; shops linked to owners. Programme data per O3. | L | Migration rehearsed on a copy of production; counts reconcile; rollback written |
| P1.4 | Orders: buyer is an `AppUser`; optional buyer shop; server sets B2C or B2B from the endpoint used (D7); purchase-order reference only on B2B; self-purchase blocked | M | Tests: a plain account cannot create a B2B order; a merchant cannot buy from their own shop |
| P1.5 | Merchant and driver applications and agent verification endpoints (apply, offer to the nearest agents per D12, record verification with interview notes, approve or reject), 18+ enforced on the server (D11), phone masking in every list view, and each verification linked to the verifying agent's account instead of today's free-text `verifiedBy` (keeps D13 possible later) | M | Tests cover the whole flow, the age rule and role checks; depends on O2 and O7 |
| P1.6 | Delivery jobs on need to know (D10): open jobs filtered to the driver's area with no buyer details; collection point after accepting; buyer name, phone and drop-off only after collection; nothing after completion; drivers can never read another driver's job | M | Tests prove each reveal happens at the right step and never earlier; replaces audit item #5; delivery fee per O6 |

### Phase 2: frontend restructure

| ID | Task | Owner | Size | Depends on |
|---|---|---|---|---|
| P2.1 | Four lazy-loaded sections with their own shell and bottom nav; move existing screens into them with redirects from old URLs; no redesign yet | X | L | P0.2 accepted, P1.2 merged |
| P2.2 | Shared hamburger menu: "Sell on thenga.com", "Drive for thenga.com", Shopping/Selling/Driving switch, account | X | M | P2.1, P1.1 |
| P2.3 | Replace the stale `hustle-onboarding.spec.ts` with an end-to-end test of the new apply-and-verify flow | X | M | P2.2, P1.5 |

### Phase 3: Shop

| ID | Task | Owner | Size |
|---|---|---|---|
| P3.1 | Shop design pass on top of the rebuilt marketplace (account, orders, merchant shop page) using `impeccable` | C | M |
| P3.2 | Checkout without the transaction-type choice, using P1.4 | X | S |
| P3.3 | Implement the remaining Shop requirements from P0.2 | X, reviewed by C | M |

### Phase 4: Sell

| ID | Task | Owner | Size |
|---|---|---|---|
| P4.1 | Sell design: Today screen, navigation, money tracking | C | M |
| P4.2 | Learn tab: quizzes from the 24 topics on the survey engine | C designs data model, X builds UI | L |
| P4.3 | Community Agent tabs: verification queue, verification form (interview notes, GPS, photos, outcome) | X, reviewed by C | L |
| P4.4 | Restock (B2B buying from inside Sell) | X | M |
| P4.5 | Community spend figure (SROI transformed) | C | M |

### Phase 5: Drive

| ID | Task | Owner | Size |
|---|---|---|---|
| P5.1 | Drive design: job queue, current job, step buttons, proof of delivery, earnings | C | M |
| P5.2 | Route map on Leaflet and OpenStreetMap (already the project's map stack): driver position, collection point, drop-off, stops in between; straight-line fallback when routing is unavailable | X, reviewed by C | L |
| P5.3 | Weak-signal behaviour: the current job stays readable offline and status updates queue until signal returns, as `CLAUDE.md` describes for drivers | X, reviewed by C | M |

### Phase 6: Back office

| ID | Task | Owner | Size |
|---|---|---|---|
| P6.1 | Hub Coordinator and Platform Admin screens: approvals oversight, agents, disputes, area reports and map. Plain is acceptable. | X, reviewed by C | L |

---

## 6. Brief for P0.2: requirements (assigned to Sandile.Codex)

**Goal.** Write the requirements the build phases will be implemented and tested against. This is documentation only: no code, dependency, configuration or asset changes.

**Read first:** `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, this file (section 2 decisions are fixed, do not reopen them), `docs/MARKETPLACE_DESIGN_PROPOSAL.md` (Shop's catalogue is already decided and built), and the current code for each screen you describe, so stories start from what exists.

**Write to `docs/requirements/`:**

| File | Covers |
|---|---|
| `README.md` | Index, glossary of the D2 role names, how to read a story |
| `01-accounts-and-modes.md` | Phone sign-up and sign-in, optional email, recovery, Shopping/Selling switch |
| `02-shop.md` | Browse, merchant shop page, cart, checkout, order tracking, guest behaviour |
| `03-sell.md` | Today, orders, products (40-product cap), point of sale, money in and out, community spend |
| `04-merchant-onboarding.md` | Apply from the hamburger menu, application states, what the applicant sees while waiting, approval and rejection |
| `05-community-agent.md` | Verification queue, the single verification step (interview notes, location, photos, outcome) |
| `06-back-office.md` | Hub Coordinator and Platform Admin |
| `07-learning.md` | Topics, quizzes, progress, how learning shows up next to trading |
| `08-drive.md` | Applying to drive, job queue, accepting a job, route and steps, proof of delivery, earnings, and exactly what the driver may see at each step (D10) |

**Story format:**

```
### SHOP-012 Track an order
As a buyer, I want to see where my order is, so that I know when to expect it.

Acceptance criteria
- Given ..., when ..., then ...

Mobile and offline: what must work on a 360px screen and on weak data
Data: existing entity and field, or "NEW: ..." with a one-line reason
Out of scope: ...
```

**Rules.**
- Prefix IDs per file: `ACC-`, `SHOP-`, `SELL-`, `ONB-`, `AGENT-`, `OPS-`, `LEARN-`, `DRIVE-`.
- Every story needs Given/When/Then acceptance criteria a test could check.
- Anything that depends on an open question in section 2, or that you cannot decide from the decisions, goes in an **Open questions** list at the end of that file. Do not invent an answer.
- Payments and WhatsApp are planned work (`CLAUDE.md`). Write a story only where the user would see them, mark it **Later**, and do not specify provider details.
- Every screen marked Keep or Transform in section 4 must be covered by at least one story. Retired screens get no stories.
- Plain language; the readers include Sandile and future agents.

**Done when:** all nine files exist; every story has acceptance criteria; a coverage table at the end of `README.md` maps each Keep or Transform screen to its story IDs; open questions are listed; links and `git diff --check` pass; the work is committed on `feature/platform-requirements` with the Codex trailer and a validation line; a note in `CODE_REVIEWS.md` asks for senior review.

---

## 7. Other Codex work, re-triaged for the new direction

The 2026-09-26 architecture assignments and R4 were written before D1 to D8. Their status now:

| Earlier task | Now |
|---|---|
| R4 native staff dashboard shells | **Finish only the Blocking fix and the test fix.** The shell pattern carries into Sell and Back office. Drop the "pin filters" item, because the facilitator queue is being replaced. |
| #1 `OperationsController` logic into a service | **Do.** Back office keeps these reports. |
| #2 `CommunityController` DTOs | **Do.** |
| #3 `IncomeService` ownership check | **Do.** Money tracking keeps this endpoint. |
| #4 `OrderService` exceptions | **Do, before Claude starts P1.4.** |
| #5 Dispatch community filter | **Moved to Claude, P1.6.** Drivers seeing jobs nationwide is now a need-to-know breach (D10), so it belongs with the access rules. |
| #6 `OrderRepository` N+1 | **Do, before Claude starts P1.4.** |
| #7 Phone masking on applicant lists | **Moved to Claude, P1.5.** Those endpoints are being replaced. |
| #8 Global exception handler | **Do.** |
| #9 Upload size and CORS doc sync | **Do.** |
| #10 Checkout and orders login gate | **Moved to P2.1.** Login changes in Phase 1. |
| #11 Mobile-first CSS inversions | **Moved to Phases 3 and 4.** The affected screens are being redesigned. |
| #12 Dead offline-queue code | **Do.** |
| New: skeleton loading | **Do, surviving screens only:** shop page (`business-page`), customer orders, notifications, hustler dashboard products and orders. Use the marketplace's loading cards as the reference: placeholders shaped like the real content, a gentle opacity pulse switched off under reduced motion, shown only after about 300ms, one "Loading" announcement for screen readers. Skip the facilitator, survey and driver screens; they are being replaced. |
| New: toolbar "Login" link nearly invisible in dark mode | **Do.** Small shell fix. |

**Codex order:** R4 fixes, then P0.2 requirements, then #6 and #4 (Claude's P1.4 waits on them), then #8, #1, #2, #3, #9, #12, then skeleton loading and the dark-mode login link. One branch and one review per item or small group, as `AGENTS.md` describes.
