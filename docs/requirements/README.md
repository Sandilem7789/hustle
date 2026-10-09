# thenga.com requirements

Status: accepted by Sandile.Claude in review R5 (9 October 2026), with the R5 fixes applied. Written against `68a2c62`. This is P0.2, not permission to start Phases 2–6. The [platform plan](../THENGA_PLATFORM_PLAN.md), especially decisions D1–D19, governs these stories. Current behaviour is evidence, not a reason to retain a retired programme process.

## Index and roles

| File | Scope |
|---|---|
| [Accounts and modes](01-accounts-and-modes.md) | One phone account, navigation, recovery, notifications |
| [Shop](02-shop.md) | Catalogue, shop page, cart, checkout, tracking |
| [Sell](03-sell.md) | Today, orders, products, POS, money, Restock, community spend |
| [Merchant onboarding](04-merchant-onboarding.md) | Application and two-step approval |
| [Community Agent](05-community-agent.md) | Nearby verification and merchant bans |
| [Back office](06-back-office.md) | Final approvals, assigned communities, oversight |
| [Learning](07-learning.md) | Topics, quizzes and progress |
| [Drive](08-drive.md) | Application, jobs, route, privacy, offline and earnings |

**Merchant:** approved seller, with one shop owned by their account. **Community Agent:** a merchant with verification tools for nearby areas. **Hub Coordinator:** staff member assigned a changeable set of communities. **Platform Admin:** platform-wide staff authority. **Driver:** delivery service provider with access limited to their job's current step. **Buyer:** what any account does in Shop, not a separate role. **Guest:** visitor without an authenticated account.

## Reading and testing stories

Each story has an ID that never changes. It says what the person wants, gives Given/When/Then checks a test can follow, and covers small screens and weak signal. It also says which data exists today and which is NEW, and what is left out. NEW means the data is needed; it does not choose the table or endpoint, which is the senior's job in Phase 1. "Later" means the story is written but not scheduled.

An open question blocks only the part of a story that depends on it. It never reopens a decision in the plan. Stories that cannot be fully built yet say **(partly blocked: …)** in their title. Do not start a build task on the blocked part until the question is answered.

Some rules come from the senior's interpretations of Sandile's decisions, not from Sandile directly. Each is marked where it is used, and Sandile can overrule any of them:
- Driver applicants go through the same two approval steps as merchants (D17).
- An agent can ban only merchants in their area, and only a Hub Coordinator or Platform Admin can lift a ban (D18).
- An agent's area is the set of communities assigned to them, the same way as a Hub Coordinator's (D19). It defaults to the community nearest their home.
- "3 months without a sale" (D15) means 90 days.
- A sale means an order that reached DELIVERED or COLLECTED. The 90 days count from final approval or from the moment the latest order reached one of those statuses. Cancelled and unfinished orders do not count.
- When staff reactivate a suspended shop, its 90 days start again from the reactivation.
- The R1,200 threshold (D16) is the goods total before the delivery fee.

Shared acceptance checks apply to every story:

- Given a 360px viewport or enlarged text, when a screen is used, then labels and primary actions remain reachable, touch targets are at least 48×48px, and the page has no horizontal overflow. The catalogue alone keeps its decided two-column mobile photo grid. Back office may favour desktop, but remains usable on a phone.
- Given light/dark theme, English/isiZulu, keyboard or screen reader use, when navigating, then controls have names, visible focus and readable contrast; status is not conveyed by colour alone. Use existing theme and translation infrastructure.
- Given a slow request, when loading exceeds about 300ms, then a content-shaped placeholder and one loading announcement appear; success, empty, error and stale cached content are distinct. No error may be presented as an empty successful result.
- Given weak/no connectivity, when a server write cannot be confirmed, then no success is claimed. Drafts and pending writes are explicitly labelled; queues exist only in the phases that implement them. Reconnection must not duplicate a committed transaction.
- Given a forged client role, account/shop ID or changed URL, when a protected operation is requested, then the server checks the session, role, ownership and assigned area. Lists mask phones to the last four digits; precise GPS/address data never enters application logs.
- Given a section has not been opened, when the app starts, then its section code is lazy-loaded only when needed (D6). No story authorizes an auth library change, paid map provider, 40-product cap change or 60km cap change.

Sources inspected: current `app.routes.ts`, app shell, all Keep/Transform page templates, registration form, community hub, facilitator queue/surveys, cart/API services, and the account, shop, order, income, verification, delivery and survey entities. [Marketplace decisions](../MARKETPLACE_DESIGN_PROPOSAL.md#10-questions-for-sandileclaude) remain settled. Current routes are listed below because the new sections do not exist yet. No runtime acceptance results are claimed for future features.

## Cross-cutting decision coverage

| Decision | Acceptance coverage |
|---|---|
| D1–D6 | ACC-001–003, ONB-001–002, AGENT-002, OPS-001, LEARN-001 |
| D7 | SHOP-004, SELL-005 |
| D8 | Phase gates in this index; implementation follows the platform plan |
| D9, D10 | DRIVE-001–005, privacy matrix |
| D11 | ONB-001, DRIVE-001 |
| D12 | AGENT-001, AGENT-003 |
| D13 | AGENT-002 (no earnings/fee), OPS-004 |
| D14 | ONB-001, AGENT-002 |
| D15 | SELL-006, OPS-003 (89/90 day boundary) |
| D16 | SHOP-005 (R1,199.99 / R1,200), SELL-005 |
| D17 | ONB-002, OPS-002, DRIVE-001 |
| D18 | AGENT-003, OPS-002, OPS-003 |
| D19 | OPS-001, OPS-002, OPS-003, OPS-004 |

## Screen coverage

| Existing screen (Keep or Transform) | Story IDs |
|---|---|
| `/marketplace` and `/` | SHOP-001–002 |
| `/business/:businessId` (plan shorthand `:id`) | SHOP-002 |
| `/checkout` | SHOP-003–007 |
| `/orders` | SHOP-008 |
| `/login` including sign-up | ACC-001–002 |
| `/apply` | ONB-001–003 |
| `/dashboard` | SELL-001–006, LEARN-003 |
| `/surveys/:id` | LEARN-001–003 |
| `/notifications` | ACC-004 |
| `/facilitator` | AGENT-001–003 |
| `/coordinator` | OPS-001–004 |
| `/operations` | OPS-004 |
| `/driver` | DRIVE-002–007 |
| `/driver/register` | DRIVE-001 |

The retired `/driver/login` receives no story; its replacement is the shared sign-in in ACC-001. Old URL redirects belong to P2.1, preserving a destination only where access is still allowed.

## Stories that are partly blocked

| Story | Blocked part | Waiting on |
|---|---|---|
| ACC-002 | Recovery without an email, and email as a second sign-in factor | Open questions in 01 |
| AGENT-001 | Search radius, ties, how long an offer lasts | Open questions in 05 |
| DRIVE-002 | What "nearby" means for drivers | Open questions in 08 |
| DRIVE-006 | Any money amount shown to drivers | O8 |
| DRIVE-007 | What happens when a delivery cannot be completed | Open questions in 08 |
| ONB-003 | Reapplying after rejection | Open questions in 04 |
| OPS-004 | Disputes | Open questions in 06 |
| SELL-006 | The community spend figure | Open questions in 03 (P4.5) |
