# Back office

Current evidence: `/coordinator` wraps the programme queue with broader fields. `/operations` displays per-community applicant/stage/active-shop totals and a Leaflet map. Neither is the new final-approval or ban-management screen. Assigned communities exist on AppUser after P1.1 step A; APIs must enforce them in later foundation work.

### OPS-001 Work within assigned communities
As a Hub Coordinator, I want my assigned communities, so that I can oversee the area I serve.

Acceptance criteria
- Given a coordinator assigned communities A and B, when Back office loads, then scoped records/reports include those communities and exclude C (D19).
- Given assignments change, when the next protected request arrives, then the server uses the current assignment rather than trusting a cached client list.
- Given a Platform Admin, when viewing oversight, then platform-wide access is available; an ordinary merchant/driver cannot open staff records by URL.

Mobile and offline: desktop tables may turn into phone cards; stale reports are labelled and mutations require connectivity.
Data: `AppUser.assignedCommunities`, Community and roles; NEW: server-scoped staff queries.
Out of scope: unlimited coordinator geography, caller-supplied trusted role headers.

### OPS-002 Give final approval
As a Hub Coordinator, I want “Merchants awaiting final approval”, so that I can review the agent's decision before a shop goes live.

Acceptance criteria
- Given an agent-approved merchant in my assigned community, when I open the queue, then verification evidence and the agent's identity are available in its detail view.
- Given only a submitted/unverified application, when I attempt final approval, then the server rejects the missing first step.
- Given final approval, when confirmed, then the shop becomes live and the applicant is notified; rejecting records a reason and leaves it unpublished (D17).
- Given another coordinator already decided the application, when I submit a stale decision, then it cannot silently overwrite that outcome.
- Given a driver application, when the same two steps finish, then job-taking eligibility is enabled; this follows the senior's explicit D17 driver assumption.

Mobile and offline: masked phones in queue, full details only on authorized inspection; confirmation clearly names the applicant; do not finalize offline.
Data: NEW: final approval/rejection state, actor/time/reason and concurrency protection; verification evidence from AGENT-002.
Out of scope: reviving the five-stage programme pipeline, automatic final approval.

### OPS-003 Manage bans and inactivity suspensions
As authorized staff, I want to stop or restore selling with an audit trail, so that eligibility is deliberate.

Acceptance criteria
- Given an in-area merchant, when a coordinator bans with a reason, then selling stops and the shop disappears; a Platform Admin can do so platform-wide (D18).
- Given a ban, when an authorized coordinator/admin lifts it, then actor/time/reason are recorded; agents cannot lift bans under the senior's assumption.
- Given a shop at day 89 without a completed platform sale, when the inactivity job runs, then it remains live; at day 90 it is suspended (D15/P1.7).
- Given the merchant contacts thenga.com and staff reactivate the suspended shop, when confirmed, then inactivity suspension is removed. A remaining ban must not be bypassed by reactivation.

Mobile and offline: show whether the restriction is a ban or inactivity suspension and require an online confirmation; keep historical records intact.
Data: NEW: separate restriction reasons, ban/suspension history and reactivation audit; existing completed orders and shop links.
Out of scope: warning schedule O9, automatic unban, deleting the merchant's history.

### OPS-004 Oversee agents, reports and disputes
As staff, I want area reports and tools, so that I can support the marketplace responsibly.

Acceptance criteria
- Given assigned communities, when a coordinator opens reports/map or exports, then totals and rows have the same scope and date range; precise private addresses are not exposed on an aggregate map.
- Given a Platform Admin changes a coordinator's assigned community set among the five seeded communities, when saved, then later staff requests respect it (D19).
- Given an agent detail, when inspected, then authorized staff can see verification history linked to that agent's account; it does not show a payment ledger in this unpaid phase (D13).
- Given dispute handling is enabled after its workflow is agreed, when a case opens, then its parties/order and staff actions are restricted to authorized staff; missing policy is not replaced by automatic refunds.

Mobile and offline: desktop-first is acceptable, with reachable phone filters/actions and text equivalents for maps; cached reports display their period/freshness.
Data: existing Community/operations statistics and verification records; NEW: commerce-based reports, assignment audit and dispute model.
Out of scope: programme cohort/call/check-in reporting in the new product, choosing dispute policy or deleting O3 data.

## Open questions

- Who besides Platform Admin may assign coordinator communities and grant/revoke Community Agent powers? Story OPS-004 specifies only the platform-admin path pending delegation policy.
- Define dispute intake, decisions, appeal, refund authority and retention before that part of OPS-004 ships.
- O3: legacy programme data deletion remains explicitly undecided. O9: inactivity warnings remain undecided. Do not run destructive migrations from this document.
- Define treatment of open orders during bans/suspensions and the inactivity clock after staff reactivation.
