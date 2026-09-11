# Facilitator-Seller & Earnings — Design Spec

**Status:** Draft for review — design only, not yet approved for build.
**Author:** Sandile.Claude · **Date:** 2026-09-11
**Relates to:** thenga.com rebrand (Ingwenya Digital (Pty) Ltd). The user-facing rebrand (Hustle Economy → thenga.com) has shipped; internal package `com.hustle.economy` stays as the codename.

> This document is a **specification for a future sprint**, not an implemented feature. No entities, endpoints, or UI described here exist yet unless explicitly noted as "already exists". Do not build speculatively — implement only when a sprint explicitly picks this up.

---

## 1. The idea, in one paragraph

Takealot and Facebook Marketplace assume a connected, platform-literate user who verifies themselves and receives a courier. thenga.com assumes none of that. The **Facilitator-Seller** is the human layer that bridges every gap the platform cannot automate in a rural context: they onboard sellers who can't self-register, verify businesses in person, confirm cash transactions, and assist last-mile handoffs. Crucially, **this is paid work** — a youth-employment engine. A young person in KwaNgwenya becomes a Facilitator-Seller and earns per verification, per onboarded seller, and per assisted transaction, *on top of* running their own store. AI handles scale; Facilitator-Sellers handle trust and community integration. That combination is the product.

---

## 2. Where the code is today (grounded)

| Concern | Current state | Gap for Facilitator-Seller |
|---|---|---|
| Roles | `AppUserRole = {CUSTOMER, HUSTLER, DRIVER, FACILITATOR, COORDINATOR}`, held many-to-many per `AppUser` (`app_user_roles`) | No paid community-agent role. `FACILITATOR` today = **program staff/admin** who approve applicants, edit business details, run the pipeline. That is a *trusted admin*, not a *gig earner*. |
| Selling | `HUSTLER` + `BusinessProfile` + `Product` + `Order` | A facilitator has no store. Nothing stops a user holding both roles technically, but no flow composes them. |
| Verification | `BusinessVerification` entity exists (visit date, GPS, photos, outcome, **`verifiedBy` as a plain `String`**) tied to an `Applicant` | `verifiedBy` is free text — **not an FK to the facilitator user**, so we cannot attribute (or pay) a verification to a specific person. |
| Orders | `Order` → `Customer` + `BusinessProfile` (`hustlerProfile`), has `transactionType`, `totalAmount` | No facilitator attribution, no commission field, no "assisted by" link. |
| Earnings/payouts | **Only** on `DeliveryJob` (driver payout). No general earnings ledger, no commission concept anywhere. | Greenfield. Must be built from scratch. |
| Onboarding | Applicant pipeline (`CAPTURED → … → APPROVED`), `capturedBy` recorded | `capturedBy` exists but isn't tied to a payable event or a facilitator user FK. |

**Takeaway:** the earnings system is entirely new. The role model *can* express "seller + facilitator" via multi-role composition, but the semantics of today's `FACILITATOR` are wrong for a paid gig worker.

---

## 3. Key design decisions (need Sandile's sign-off)

### D1 — New role vs. reuse `FACILITATOR` *(recommend: new role)*
Today's `FACILITATOR` can approve/reject/revoke applications and edit business details — a high-trust admin surface. A community Facilitator-Seller earning per transaction should **not** automatically get application-approval powers (fraud risk: they'd be paid per onboarded seller *and* able to approve their own onboards).

**Recommendation:** add `FACILITATOR_SELLER` as a distinct `AppUserRole`. Keep `FACILITATOR`/`COORDINATOR` as program-staff roles. A Facilitator-Seller holds `{HUSTLER, FACILITATOR_SELLER}`. Approval of an application they onboarded must be done by a *staff* `FACILITATOR`/`COORDINATOR` (four-eyes principle).

*Alternative considered:* reuse `FACILITATOR` and gate the admin actions behind `COORDINATOR`. Rejected — it overloads one role with two trust levels and makes every server-side check ambiguous.

### D2 — Earnings model: ledger, not a balance field *(recommend: append-only ledger)*
Store earnings as an **append-only `FacilitatorEarning` ledger** (one row per earning event), never as a mutable running total on the user. Balance = sum of unpaid ledger rows. This is auditable, reversible (reversal = compensating row), and matches how you'd report to NYDA/SEDA funders on youth income generated.

### D3 — What events earn, and how much is configured
Three earning event types, each with a configurable rate (see §5). Rates must be **server-configured**, never client-supplied.

### D4 — Payout mechanism *(open — see §8)*
Whether payouts are cash-via-coordinator, EFT, or wallet depends on the payments sprint. The ledger is payout-mechanism-agnostic; a `PayoutBatch` references settled ledger rows.

---

## 4. Data model (proposed)

New entities (following the project's entity → repository → service → DTO → mapper → controller order):

### 4.1 `FacilitatorEarning` (append-only ledger)
```
id                UUID
facilitator       FK → AppUser            // the earner (must hold FACILITATOR_SELLER)
eventType         enum EarningEventType   // VERIFICATION | SELLER_ONBOARDED | ASSISTED_TRANSACTION
amount            BigDecimal(12,2)        // ZAR, snapshot of the rate at time of event
currency          "ZAR"                   // fixed for now
sourceType        enum EarningSourceType  // BUSINESS_VERIFICATION | APPLICANT | ORDER
sourceId          UUID                    // id of the verification / applicant / order
status            enum EarningStatus      // PENDING | APPROVED | PAID | REVERSED
communityId       FK → Community          // for community-level reporting / SROI
payoutBatchId     FK → PayoutBatch (nullable)
note              TEXT (nullable)
createdAt / updatedAt
```
- **Idempotency:** unique constraint on `(eventType, sourceType, sourceId)` so the same verification/onboarding/order can never generate two earning rows.

### 4.2 `EarningRate` (server config)
```
id UUID
eventType   enum EarningEventType (unique per active period)
amount      BigDecimal(12,2)   // flat ZAR for VERIFICATION / SELLER_ONBOARDED
percentage  BigDecimal(5,2) nullable  // for ASSISTED_TRANSACTION (% of order total), if used
effectiveFrom / effectiveTo   // rate history — never overwrite, add a new row
active      boolean
```
Rate resolution at event time picks the row active for that `eventType` on that date. Historical earnings keep their snapshotted `amount`.

### 4.3 `PayoutBatch`
```
id UUID
facilitator   FK → AppUser
totalAmount   BigDecimal(12,2)
method        enum PayoutMethod  // CASH_VIA_COORDINATOR | EFT | WALLET (see §8)
reference     String nullable
status        enum PayoutStatus  // OPEN | SETTLED | CANCELLED
createdBy     FK → AppUser       // coordinator/staff who authorised
settledAt / createdAt
```

### 4.4 Changes to existing entities
- `BusinessVerification.verifiedBy: String` → add `verifiedByUser: FK → AppUser` (keep the string for legacy rows; backfill nullable). This is what makes a verification **attributable and payable**.
- `Applicant` — already has `capturedBy` (string). Add `onboardedByUser: FK → AppUser (nullable)` to attribute the SELLER_ONBOARDED earning to a Facilitator-Seller (distinct from staff who capture from paper forms — only community onboards earn).
- `Order` — add `assistedByUser: FK → AppUser (nullable)`. Set only when a Facilitator-Seller assisted a cash/last-mile transaction. Drives ASSISTED_TRANSACTION earnings.
- `AppUserRole` enum — add `FACILITATOR_SELLER`.

No table renames, no package rename — all additive, migration-safe.

---

## 5. Earning events — when a ledger row is created

| Event | Trigger | Guard | Amount source |
|---|---|---|---|
| `VERIFICATION` | `BusinessVerification.outcome` set to a passing value **and** `verifiedByUser` holds `FACILITATOR_SELLER` | one per verification (idempotent on `sourceId`); not earned if verifier is staff-only `FACILITATOR` | `EarningRate(VERIFICATION)` flat ZAR |
| `SELLER_ONBOARDED` | Applicant reaches `APPROVED` **and** `onboardedByUser` is a `FACILITATOR_SELLER` (not just `capturedBy`) | one per applicant; the approving staff member must be a *different* user (D1 four-eyes) | `EarningRate(SELLER_ONBOARDED)` flat ZAR |
| `ASSISTED_TRANSACTION` | `Order` reaches a terminal success state (e.g. `DELIVERED`/collected) **and** `assistedByUser` set | one per order; excluded if the assister is the seller of that order | flat ZAR, *or* % of `totalAmount` — **decide in §8** |

All three create earnings in `status = PENDING`; a staff `COORDINATOR` moves them to `APPROVED` before they can enter a `PayoutBatch`. Reversal (fraud, cancelled order) = new `REVERSED` compensating row, original untouched.

---

## 6. API surface (proposed, per project conventions — `/api`, `X-Auth-Token`, `{data,message,success}` envelope)

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/api/facilitator-earnings/my` | `FACILITATOR_SELLER` | Own earnings feed + pending/approved/paid totals |
| GET | `/api/facilitator-earnings?community=&status=` | `COORDINATOR` | Review queue across community |
| PATCH | `/api/facilitator-earnings/{id}/approve` | `COORDINATOR` | PENDING → APPROVED |
| PATCH | `/api/facilitator-earnings/{id}/reverse` | `COORDINATOR` | Compensating reversal (reason required) |
| GET | `/api/earning-rates` | `COORDINATOR` | Current + historical rates |
| POST | `/api/earning-rates` | `COORDINATOR` | Add a new rate period (never edit in place) |
| POST | `/api/payout-batches` | `COORDINATOR` | Bundle APPROVED earnings into a payout |
| PATCH | `/api/payout-batches/{id}/settle` | `COORDINATOR` | Mark settled + reference |
| GET | `/api/payout-batches/my` | `FACILITATOR_SELLER` | Own payout history |

Every earning-creating action is a **server-side side effect of an existing flow** (verification save, applicant approval, order completion) — no client endpoint creates earnings directly. This is the anti-fraud spine.

---

## 7. Frontend surfaces (mobile-first, per Design Mandate)

- **Facilitator-Seller dashboard** — extend, don't fork. A user with `{HUSTLER, FACILITATOR_SELLER}` sees their normal seller dashboard **plus** an "Agent" tab: earnings feed (this month / pending / paid), onboarding shortcut, verification queue assigned to them, and a payout history list. Single-column cards, 48px targets, no hover.
- **Onboarding assist flow** — a Facilitator-Seller registers a seller on their behalf (captures details, takes GPS + photos on the verification visit). Reuses the existing applicant + verification screens; adds `onboardedByUser`/`verifiedByUser = self`.
- **Coordinator earnings review** — extends `/coordinator`: approve/reverse earnings, set rates, cut payout batches.
- **Bottom nav** — no new tab; the "Agent" surface lives inside the existing role area to respect the max-5-item rule.

---

## 8. Open questions for Sandile

1. **ASSISTED_TRANSACTION amount** — flat fee per assisted order, or a % of order value? A % aligns incentives with GMV but complicates the funder story (income becomes variable). *My lean: flat fee to start, revisit once volume exists.*
2. **Who may hold `FACILITATOR_SELLER`?** Is it open application, or granted only by a `COORDINATOR` after training (the Wild Impact 24-topic programme)? *My lean: coordinator-granted — it's a trusted, paid role.*
3. **Payout mechanism** (D4) — cash via coordinator now, EFT later, or a platform wallet? Blocks `PayoutMethod` finalisation and ties into the payments sprint (Peach/Ozow/PayFast).
4. **Self-dealing rules** — confirm the guards in §5 (a facilitator can't verify/approve/assist their own store or their own onboards). Any community-size exceptions where the same person unavoidably wears both hats?
5. **Funder reporting** — do NYDA/SEDA need a specific "youth income generated per community" export? If so, `communityId` on the ledger already supports it; we'd add a report endpoint.

---

## 9. Suggested build order (when approved)

1. `AppUserRole.FACILITATOR_SELLER` + role-grant flow (coordinator-assigns).
2. `EarningRate` entity + config endpoints + seed default rates.
3. Attribution FKs on `BusinessVerification` / `Applicant` / `Order` (additive migration).
4. `FacilitatorEarning` ledger + idempotent event hooks in the three existing flows.
5. Coordinator review/approve/reverse endpoints + UI.
6. Facilitator-Seller "Agent" dashboard tab.
7. `PayoutBatch` + settlement (gated on payments-sprint decision for method).

Each step ships behind the existing role checks and adds at least one integration test in `tests/` against the real DB (per project testing rules).

---

## 11. Reviewer feedback & additional ideas

Reviewing this spec (Sandile.Codex, Claude in VS Code, Claude chat / BA)? **Append attributed, dated notes below** — don't rewrite the sections above. Raise disagreements with evidence; propose additions freely. The senior (Sandile.Claude) folds accepted changes into the spec body and records the resulting decisions in [`../CODE_REVIEWS.md`](../CODE_REVIEWS.md).

Format: `**<who>, <date>:** <note>`

_(none yet)_
