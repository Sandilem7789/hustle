# Last-Mile Parcel Relay — Design Spec

**Status:** Decisions recorded 2026-09-11 (§3, §8) — design only, not yet scheduled for a sprint. Build order in §11.
**Author:** Sandile.Claude · **Date:** 2026-09-11
**Relates to:** [`FACILITATOR_SELLER_SPEC.md`](FACILITATOR_SELLER_SPEC.md) — hubs are operated by the Facilitator-Seller layer.

> Specification for a future sprint. Nothing here exists in code yet. Do not build speculatively.

---

## 1. The problem, in one paragraph

National couriers (CourierGuy, Aramex, PostNet, Fastway) deliver to urban areas and townships but **do not deliver to rural homesteads** like KwaNgwenya. A person who buys from Takealot, Shein, or any online shop gets their parcel stranded at a depot in **Mkuze town** or a nearby township — and then has to find their own transport to fetch it, often 20–40 km away. thenga.com closes that gap with a **last-mile relay**: the same local drivers who deliver seller orders also collect stranded parcels from the depot and bring them to the rural home, for a cash fee paid on delivery. It is a delivery business in its own right, independent of whether the buyer ever used a thenga seller.

---

## 2. How this differs from the delivery we already have

The existing `DeliveryJob` is **hard-coupled to an on-platform `Order`** — it needs a thenga `Customer`, a thenga seller (`BusinessProfile`), and catalog `OrderItem`s. Pickup = seller GPS, dropoff = customer address, one driver, single pickup → single drop, payout = 10% of order total.

A last-mile parcel has **none of those**: no thenga seller, no thenga order, no catalog items. The parcel originates outside the platform and is *logged at a hub when it physically arrives*. And one driver run carries **many parcels to many homes** (a milk run), which the current one-order-one-job model can't express.

**Decision (technical):** build **parallel entities** (`Hub`, `Parcel`, `Trip`, `DeliveryTariff`) rather than generalising `DeliveryJob`. Reason: `DeliveryJob`/`DispatchService` is working seller-delivery code tightly bound to `Order`; overloading it would risk that flow for no benefit. The two share the **Driver**, driver auth, the driver dashboard shell, the Leaflet map, GPS, and proof-of-delivery photo patterns — reuse those, not the entity. A future unification (a `Trip` that carries both seller orders and parcels) is possible later but is out of scope here.

---

## 3. Decisions locked in (2026-09-11)

- **Origination:** hub operator logs parcels as they physically arrive at the depot. Control sits with the trusted local layer (a Facilitator-Seller running a hub), not with the buyer self-requesting.
- **Consolidation:** one driver **Trip** carries **many parcels** to many homes from a depot run.
- **Payment:** **cash on delivery**, priced by a **fixed zone tariff** (e.g. Mkuze depot → KwaNgwenya = R\_\_), not per-km. Flat per zone; parcel size does not change the price.
- **Consent:** the recipient must agree to the fee before a parcel can be `ASSIGNED`. Until WhatsApp exists, the hub operator phones the recipient and records consent on the parcel.
- **Failed delivery:** first failed attempt is free and the parcel returns to the hub; a second attempt needs fresh consent and is charged the tariff again; after 7 days unclaimed the parcel is `RETURNED` to the courier depot.
- **Cash custody:** driver settles to the hub operator per trip; hub settles to the platform weekly through the shared ledger; the driver never holds platform cash overnight. Platform share accrues to the wallet machinery defined in the Facilitator-Seller spec (D4).
- **Recipients:** always guests (name, phone, address). Phone numbers normalised with `PhoneUtils.normalize` so repeat recipients are recognised and reused.
- **Trips:** one hub per trip.
- **Courier integration:** waybill typed by hand. Barcode scanning and courier API lookups are a later phase.

---

## 4. Actors

| Actor | Role | In this flow |
|---|---|---|
| Hub operator | `FACILITATOR_SELLER` (or staff) | Receives parcels at the depot/spaza, logs them, hands them to a driver |
| Driver | `DRIVER` | Creates/accepts a Trip from a hub, delivers parcels, collects cash, uploads proof |
| Recipient | **not necessarily a thenga user** | The rural buyer waiting for their parcel — guest data (name + phone + address), like guest checkout |
| Coordinator | `COORDINATOR` | Registers hubs, sets zone tariffs, reconciles cash |

---

## 5. Data model (proposed)

Follow the project order: entity → repository → service → DTO → mapper → controller. All additive — no changes to existing tables.

### 5.1 `Hub` (collection point)
```
id            UUID
name          String                 // "CourierGuy Mkuze", "KwaNgwenya Spaza — Thabo"
type          enum HubType           // COURIER_DEPOT | POSTNET | PARTNER_SPAZA | OTHER
community     FK → Community
latitude / longitude
address       String
operator      FK → AppUser (nullable) // the Facilitator-Seller who runs it
active        boolean
createdAt / updatedAt
```

### 5.2 `Parcel`
```
id             UUID
hub            FK → Hub               // where it was logged / collected from
loggedByUser   FK → AppUser           // hub operator who logged it
courierName    String                 // external courier, free text ("Takealot / CourierGuy")
waybillRef     String (nullable)      // external tracking number — treat as sensitive
description    String                 // "medium box", so the driver knows what to carry
sizeBand       enum ParcelSize        // SMALL | MEDIUM | LARGE — driver information only; tariff is flat per zone
consentMethod  enum ConsentMethod (nullable) // PHONE_CALL | WHATSAPP | IN_PERSON — how the recipient agreed to the fee
consentConfirmedAt timestamp (nullable) // required before ASSIGNED
attemptCount   int @default(0)        // delivery attempts made
recipientName  String
recipientPhone String                 // PII — mask in lists, never log
destCommunity  FK → Community
dropoffAddress String
dropoffLat / dropoffLng (nullable)
deliveryFee    BigDecimal(12,2)       // snapshot of the zone tariff at log time
status         enum ParcelStatus      // LOGGED | ASSIGNED | OUT_FOR_DELIVERY | DELIVERED | FAILED | RETURNED
trip           FK → Trip (nullable)
cashCollected  boolean  @default(false)
cashAmount     BigDecimal(12,2) (nullable)
proofPhotoUrl  String (nullable)
deliveredAt / createdAt / updatedAt
```
Idempotency / integrity: a parcel can belong to at most one active `Trip`; status transitions validated server-side (see §6).

### 5.3 `Trip` (consolidated driver run)
```
id           UUID
driver       FK → Driver
originHub    FK → Hub
status       enum TripStatus          // OPEN | IN_PROGRESS | COMPLETED | CANCELLED
// totalCashDue is not stored — computed on read as the sum of deliveryFee over the trip's parcels
createdAt / startedAt / completedAt
```
A Trip has many `Parcel`s (`parcel.trip_id`). Driver adds LOGGED parcels from `originHub` to a Trip, then works through them.

### 5.4 `DeliveryTariff` (zone pricing — coordinator config)
```
id             UUID
originHub      FK → Hub (nullable)    // or origin community if hub-agnostic
destCommunity  FK → Community
fee            BigDecimal(12,2)       // recipient pays this
driverCut      BigDecimal(12,2)       // driver keeps this; platform keeps fee - driverCut
failedAttemptDriverCut BigDecimal(12,2) (nullable) // paid to the driver for a FAILED attempt; null = nothing
sizeBand       enum ParcelSize (nullable) // if pricing varies by size
effectiveFrom / effectiveTo          // rate history — never edit in place, add a row
active         boolean
```
Fee resolution at log time picks the active tariff for (hub/origin, destCommunity, sizeBand). The parcel snapshots `deliveryFee` so later tariff changes don't rewrite history.

---

## 6. Status flows

**Parcel:** `LOGGED` → `ASSIGNED` (added to a Trip; **rejected unless `consentConfirmedAt` is set**) → `OUT_FOR_DELIVERY` (Trip started) → `DELIVERED` (proof photo + cash marked) | `FAILED` (recipient unreachable or refuses; `attemptCount` incremented, parcel goes back to `LOGGED` at the hub with consent cleared) → after 7 days unclaimed, `RETURNED` (to the courier depot, closed). A second attempt requires fresh consent and is charged the tariff again. Server validates transitions, same pattern as `DispatchService.validateTransition`.

**Trip:** `OPEN` (driver assembling parcels) → `IN_PROGRESS` (left the hub) → `COMPLETED` (all parcels DELIVERED/FAILED). Completing a trip triggers cash reconciliation (§7).

---

## 7. Cash flow & reconciliation *(decided 2026-09-11)*

Cash-on-delivery means money moves outside the app, so reconciliation is the risky part:
1. Recipient pays the driver `deliveryFee` in cash on handover; driver marks `cashCollected = true`, `cashAmount`.
2. Driver keeps `driverCut`; the remainder (`fee − driverCut`) is **owed to the hub**.
3. **Per trip, driver → hub:** on Trip `COMPLETED` the system computes the platform share owed (sum over delivered parcels) and the driver hands that cash to the hub operator on return. The hub operator confirms the amount received in the app; any mismatch is stored as a visible variance, never silently overwritten. The driver never holds platform cash overnight.
4. **Weekly, hub → platform:** the hub's accumulated platform share is settled through the same **ledger / `PayoutBatch` / wallet machinery defined in the Facilitator-Seller spec** (reused, not rebuilt). The hub operator is the accountable party, which is why that role is a trained, paid one.

This keeps every cent auditable and feeds the same "income generated per community" funder reporting.

---

## 8. Decisions (Sandile, 2026-09-11)

1. **Recipient consent** — **Required before `ASSIGNED`.** Neither `NotificationService` (in-app, `BusinessProfile` recipients only) nor `N8nWebhookService` (survey reports only) can reach a non-user, and WhatsApp is not built. Interim: the hub operator phones the recipient and records `consentMethod` + `consentConfirmedAt`. The automated message replaces the phone call later without changing the state machine.
2. **Failed delivery** — First attempt free, back to hub. Second attempt needs fresh consent and is charged again. `RETURNED` to courier after 7 days unclaimed. Driver compensation for a failed attempt comes from `DeliveryTariff.failedAttemptDriverCut`; the coordinator sets it per zone (may be zero).
3. **Size and tariff** — **Flat per zone.** `sizeBand` stays on the parcel for the driver's information; `DeliveryTariff.sizeBand` stays nullable so size pricing can be added later without a schema change.
4. **Cash custody and cadence** — **Driver → hub per trip, hub → platform weekly** (§7). The driver never holds platform cash overnight.
5. **Recipient identity** — **Guest always.** Phones normalised with `PhoneUtils.normalize`; repeat recipients' details are reused rather than retyped. No account offer yet.
6. **Multi-hub trips** — **One hub per trip.**
7. **Courier integration** — **Later phase.** Waybill typed by hand for now.

---

## 9. Frontend surfaces (mobile-first)

- **Hub operator** (inside the Facilitator-Seller "Agent" area): "Log a parcel" form (courier, waybill, recipient name/phone, destination community + address, auto-filled fee from tariff), and a list of parcels held at their hub by status. Phones masked in the list.
- **Driver dashboard** — new "Parcels" tab beside seller jobs: parcels available at hubs in/near their community, "Start a run" to assemble a Trip, then a delivery checklist per parcel with the Leaflet map, tap-to-call recipient, `cash collected` toggle, and proof photo. Reuses the existing driver map/GPS/photo components.
- **Coordinator** (`/coordinator`): register hubs, manage zone tariffs, cash reconciliation view.
- **Recipient** — no login required. Once WhatsApp exists, a message with a tracking link; until then the hub operator gives the fee and expected window by phone when taking consent. The tracking page shows status, fee and expected window only: no address, no waybill, no driver phone.

---

## 10. Security / PII (per CLAUDE.md)

- Recipient phone + dropoff address + GPS are **PII** — mask phones in all list views (last 4 digits), never write address/GPS to application logs.
- `waybillRef` can expose an external account — treat as sensitive, don't surface publicly beyond the recipient's own tracking view.
- Every parcel/trip write validates the actor's role and ownership server-side (hub operator owns the hub; driver owns the trip) — never trust the client.
- Proof-of-delivery image: validate MIME + 5 MB cap like all uploads.

---

## 11. Suggested build order (when approved)

0. **Prerequisites** (shared with the Facilitator-Seller spec): Flyway baseline migration; `UserRole` → `AppUserRole` unification. Decide whether `Driver` is folded into `AppUser` before the driver dashboard gains a second tab.
1. `Hub` + `DeliveryTariff` entities + coordinator config endpoints/UI + seed the Mkuze→KwaNgwenya tariff. Pure config, no money moves.
2. `Parcel` entity + hub-operator "log parcel" flow + fee auto-fill from tariff + manual consent recording.
3. `Trip` entity + driver "assemble a run" + parcel status flow (consent gate, attempt counting) + proof photo.
4. Per-trip driver → hub cash confirmation with variance.
5. Weekly hub → platform settlement via the shared ledger / wallet (depends on Facilitator-Seller spec §4 and D4).
6. Recipient tracking link.
7. Automated consent message once the WhatsApp integration exists.

Each step ships behind role checks and adds at least one integration test in `tests/` against the real DB.

---

## 12. Reviewer feedback & additional ideas

Reviewing this spec (Sandile.Codex, Claude in VS Code, Claude chat / BA)? **Append attributed, dated notes below** — don't rewrite the sections above. Raise disagreements with evidence; propose additions freely. The senior (Sandile.Claude) folds accepted changes into the spec body and records the resulting decisions in [`../CODE_REVIEWS.md`](../CODE_REVIEWS.md).

Format: `**<who>, <date>:** <note>`

**Sandile.Claude (VS Code), 2026-09-11 — §2 decision:** Agree with parallel entities. Verified: `DispatchService` derives the payout from `order.getTotalAmount()` and `validateTransition` is private to `JobStatus`; there is nothing generic to reuse at the entity level.

**Sandile.Claude (VS Code), 2026-09-11 — Q1 and §9, notification reuse is not possible today:** `NotificationService.create()` takes a `BusinessProfile` recipient and writes an in-app notification row, and `N8nWebhookService` only triggers survey report generation. Neither can reach a person who is not a platform user, and WhatsApp is on the not-yet-built list in `CLAUDE.md`. So the consent step cannot ship as described until the WhatsApp sprint lands. Interim design: the hub operator phones the recipient and records `consentConfirmedAt` and `consentMethod` (`PHONE_CALL | WHATSAPP | IN_PERSON`) on the `Parcel`; a parcel cannot move to `ASSIGNED` without it. Swap in the automated message later without changing the state machine.

**Sandile.Claude (VS Code), 2026-09-11 — §4 two auth systems:** Drivers authenticate with `X-Driver-Token` against `DriverSession`, and `Driver` is not an `AppUser`. Hub operators authenticate with `X-Auth-Token` against `AppUser`. `Trip` endpoints will therefore live on the driver side and `Parcel` logging on the app-user side, with two different `requireAuth` paths. That works, but this is the second feature (after the seller-delivery flow) to pay for the split. Consider whether unifying `Driver` into `AppUser` with the existing `DRIVER` role is cheaper than carrying both forever. Not a blocker for this spec, but it should be a conscious decision before the driver dashboard grows a second tab.

**Sandile.Claude (VS Code), 2026-09-11 — §5.3 `totalCashDue`:** Stored derived value. Every parcel add, remove, or `FAILED` transition has to keep it in sync, and the first bug will be a trip whose total disagrees with its parcels. Compute it from the parcels on read.

**Sandile.Claude (VS Code), 2026-09-11 — Q4 cash custody:** Settle driver → hub per trip: on `Trip.COMPLETED` the driver hands `Σ(fee − driverCut)` to the hub operator, who confirms the amount in the app (mismatch stays visible as a variance, not silently overwritten). Hub → platform weekly through the shared ledger. The driver should never hold platform cash overnight; the hub operator is the accountable, trained, paid role from the other spec, which is the point of that role.

**Sandile.Claude (VS Code), 2026-09-11 — Q2 failed delivery:** Add `attemptCount` to `Parcel`. First failed attempt is free and returns to hub; a second attempt requires fresh consent and charges the same tariff again. After a hold period (7 days?) the parcel is `RETURNED` to the courier depot and the hub logs it as closed. The driver's cut on a failed attempt is a question for the tariff table: a `failedAttemptDriverCut` column, or nothing, but decide it, because drivers will not roll out twice for free.

**Sandile.Claude (VS Code), 2026-09-11 — Q3:** Flat per zone to start. Keep `sizeBand` on `Parcel` for the driver's benefit (what to carry), leave it nullable on the tariff so size pricing can be introduced without a schema change.

**Sandile.Claude (VS Code), 2026-09-11 — Q5:** Guest always at first, but normalise `recipientPhone` with the existing `PhoneUtils.normalize` and reuse the same recipient details on repeat parcels so the hub operator does not retype them. That gives you the customer list for a later "create account" offer without a user table now.

**Sandile.Claude (VS Code), 2026-09-11 — Q6:** One hub per trip. Agree.

**Sandile.Claude (VS Code), 2026-09-11 — §9 tracking link:** The parcel UUID in the URL is unguessable enough. The page itself must show status, fee, and estimated window only. No recipient address, no waybill, no driver phone. The waybill in particular identifies the recipient's account with the external courier.

**Sandile.Claude (VS Code), 2026-09-11 — build order:** §11 step 5 depends on the ledger from the other spec, and both specs depend on Flyway (see my note there). Suggested combined order: Flyway → role unification → `Hub` + `DeliveryTariff` → `Parcel` with manual consent → `Trip` → ledger from the seller spec → cash reconciliation → automated consent once WhatsApp exists. Hubs and tariffs are pure config and can ship first without any money moving.
