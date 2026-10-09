# Drive

Current evidence: separate driver registration/login and job APIs exist. `/driver` has Jobs, Active Delivery and Earnings, a Leaflet map, status buttons and proof-photo upload. Current open jobs reveal delivery addresses and historical earnings are delivered-job records. Those behaviours must change under D10; they are not accepted privacy contracts.

## Required server disclosure by step (D10)

| Step | Driver may receive | Must not receive |
|---|---|---|
| Open nearby offer | A job summary that identifies no one, the area and distance, and a payout estimate once O8 is decided (blocked until then) | Buyer identity, phone, address, exact drop-off, hidden data in nested order objects |
| Accepted by this driver | Collection point and instructions needed to collect | Buyer name/phone/drop-off; other drivers' jobs |
| Collected / en route | Own current job's buyer name, phone, drop-off and relevant stops | Other orders, merchant sales, unrelated people/locations |
| Completed | A separate non-identifying earnings summary only | Access to the completed job, buyer/collection details, route/proof photos |

The payload, caches and map data must follow the same matrix. “Hidden” CSS or phone masking is insufficient when a forbidden field remains in an API response. Earnings must not become a back door to completed-job details; the exact safe ledger fields await O8/P5 design.

### DRIVE-001 Apply on my existing account
As an adult driver, I want to apply from the shared menu, so that I can offer delivery without another login.

Acceptance criteria
- Given my phone account, when I select “Drive for thenga.com”, then identity is reused and vehicle, licence/identity evidence and home area are collected (D3, D9).
- Given I am one day short of 18, when I apply, then the server refuses; on my 18th birthday the age rule lets me apply (D11).
- Given agent approval but no final approval, when I open Drive, then I can see my application status but cannot take jobs; final coordinator approval enables eligibility (D17 driver's two-step flow is the senior's stated assumption).
- Given rejected/pending status, when I reopen the application, then it explains that status instead of issuing separate driver credentials.

Mobile and offline: native camera/file input and labelled vehicle/community controls; upload errors preserve fields; no offline eligibility claim.
Data: existing Driver vehicle/licence/community fields; `AppUser.dateOfBirth`/home location; NEW: driver-to-account link and two-stage verification.
Out of scope: `/driver/login`, new sessions, deciding licence exceptions for bicycles.

### DRIVE-002 Find and accept nearby work (partly blocked: what "nearby" means)
As an approved driver, I want nearby open jobs, so that I can choose my next delivery.

Acceptance criteria
- Given an eligible driver in an area, when the queue loads, then only server-authorized nearby offers appear without buyer details, including in raw API responses (D10).
- Given two drivers accept the same open job, when both requests reach the server, then only one is assigned; the other receives a clear no-longer-available outcome.
- Given an unapproved driver, forged community or another driver's assigned job ID, when requested, then it cannot grant acceptance or access.

Mobile and offline: visible summary/accept controls; stale offers cannot be accepted offline; no precise hidden drop-off in the map payload.
Data: `DeliveryJob.status`, driver/order link, payout amount; NEW: area filtering, safe offer DTO and atomic assignment.
Out of scope: choosing radius, capacity or a nationwide queue.

### DRIVE-003 Collect before seeing the buyer
As an assigned driver, I want collection guidance, so that I can pick up the parcel before delivery details are released.

Acceptance criteria
- Given a job assigned to me, when I open Current, then collection point and instructions are available and buyer name, phone and drop-off are absent (D10).
- Given I have not collected, when I query any job/order/status endpoint, then buyer details remain withheld server-side.
- Given a valid collected transition is confirmed, when I reload Current, then the buyer's name, tap-to-call phone and drop-off become available for this job only.
- Given a different driver, when they request that job, then they receive no private details at any step.

Mobile and offline: large step button and route instructions; a queued offline “collected” action does not unlock buyer information before server acceptance.
Data: `JobStatus.ASSIGNED/PICKED_UP`, assigned driver and Order contact/location; NEW: step-specific responses and transition validation.
Out of scope: client-only redaction, revealing all steps in advance for offline convenience.

### DRIVE-004 Follow the route and complete delivery
As a driver on my own current job, I want a route and clear steps, so that I can complete the delivery correctly.

Acceptance criteria
- Given the current authorized step, when the map opens, then Leaflet/OpenStreetMap shows my position and only the collection/drop-off/intermediate stops I may currently see (D9, D10).
- Given routing is unavailable, when coordinates are authorized and known, then a labelled straight-line fallback appears without pretending to be road navigation.
- Given a collected job, when I move through En Route and delivery completion with required proof, then the server validates step order and ownership.
- Given completion succeeds, when I attempt to reopen or refetch the job, then its private details are no longer available and local private route/contact/proof data is cleared.

Mobile and offline: 48px step actions, readable map alternatives, permission-denied guidance; proof upload obeys 5MB image rules and does not report completion before server confirmation.
Data: `DeliveryJob.status`, proof photo, deliveredAt; Order authorized locations; NEW: ordered intermediate stops if required and step-scoped map data.
Out of scope: paid maps, driver access to merchant sales, choosing failed-delivery/return policy.

### DRIVE-005 Retain only authorized current work offline (P5.3)
As a driver with weak signal, I want my current step to remain readable, so that I can continue without exposing extra data.

Acceptance criteria
- Given an authorized current job was loaded online, when signal drops, then only previously authorized current-step details remain readable with a stale/offline label.
- Given I queue a status update, when offline, then it is labelled pending; reconnect submits it once in order and a rejected transition is shown for resolution.
- Given collected status is queued but not acknowledged, when offline, then buyer data stays unavailable until a successful server transition and fetch.
- Given completion/sign-out or loss of eligibility is confirmed, when the cache is reconciled, then private job data is purged; it is never retained as job history (D10).

Mobile and offline: small explicit sync state, no blocking full-screen offline overlay; text instructions remain usable without map tiles.
Data: NEW: scoped current-job IndexedDB cache and deduplicated pending status queue (P5.3), tied to the account and job, never an unbounded completed-job cache.
Out of scope: prefetching future-step buyer details, promising offline assignment, choosing map tile download policy without review.

### DRIVE-006 Understand earnings (blocked in part by O8)
As a driver, I want my earned amount, so that I know what delivery work paid.

Acceptance criteria
- Given the payout-share rule is decided, when earnings are computed, then they use that server rule rather than assuming the whole buyer fee belongs to the driver (O8).
- Given completed deliveries, when I open Earnings, then totals and permitted ledger information do not expose buyer identity, route, proof or a link that reopens the completed job (D10).
- Given a failed earnings request, when rendered, then it is an error rather than R0 earned.

Mobile and offline: clear ZAR amount and period, stale totals labelled; distinguish earned from paid once settlement exists.
Data: `DeliveryJob.payoutAmount` exists today; NEW: an earnings view that shows amounts without any buyer or route details, and whether each amount has been paid, once specified.
Out of scope: choosing driver/platform share, wallet, automatic cash-out or payment provider.

### DRIVE-007 Handle an interrupted delivery (partly blocked: what happens next)
As a driver, I want help when a job cannot proceed, so that I do not falsely mark it delivered.

Acceptance criteria
- Given location permission, routing or proof upload fails, when I remain on Current, then a clear retry/help state appears and the job retains the last confirmed status.
- Given the buyer cannot be reached or the delivery cannot be completed, when I ask for help, then the job keeps its last confirmed status and is never marked Delivered automatically. Who I am put in touch with is not yet decided.

Mobile and offline: actionable text, retained pending proof until upload outcome is known, no forced repeated photo capture for a transient failure.
Data: existing job status; NEW: exception/escalation state only after policy is decided.
Out of scope: importing parcel retry fees or seven-day return rules from the unscheduled last-mile spec.

## Open questions

- O8: driver share of the buyer's delivery fee; no monetary promise can ship before this is decided.
- Define nearby area/radius, multiple active jobs, ordered stops and how offer summaries avoid identifying buyer locations in sparse communities.
- Confirm vehicle-specific licence evidence, collection proof and whether signature is an accepted alternative to photo.
- Define failures, cancellations, returns and support contact; do not reuse unscheduled parcel policy by assumption.
- Define cache expiry/revalidation on long disconnection, revoked assignment handling, proof retention and privacy-safe earnings fields. D10's current-step limits are fixed.
