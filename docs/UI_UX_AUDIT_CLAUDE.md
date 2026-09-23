# UI/UX Audit — thenga.com (Sandile.Claude, independent pass)

**Scope:** every page under `frontend/src/app/pages/` and every component under `frontend/src/app/components/`, plus the app shell (`app.component.*`) and global tokens (`styles.css`). Produced under `CODEX_TASK_UIUX_AUDIT.md`'s Phase 0 brief, run independently in an isolated worktree so it wouldn't collide with Sandile.Codex's own pass on the same task. **No code changed.** Named `UI_UX_AUDIT_CLAUDE.md` (not `UI_UX_AUDIT.md`) so the two audits can be diffed and merged rather than overwriting each other.

**Method:** read all seven installed design skills (`impeccable`, `frontend-design`, `design-taste-frontend`, `ui-ux-pro-max`, `emil-design-eng`, `animate`, `improve-animations`) and applied their frameworks by hand — none of their helper scripts were run, since this is a read-only audit and running third-party scripts (binary downloads, network calls) wasn't warranted for that. `design-taste-frontend` is scoped to landing pages/portfolios/redesigns and explicitly excludes dashboards and multi-step product UI, so it applied narrowly (mostly to typographic/anti-default guidance) rather than as a whole framework — this app is almost entirely `impeccable`'s "Operate" mode (task completion, not persuasion). Every finding below is cited to a real file and line; nothing is invented.

---

## Cross-cutting findings

These affect most or all screens. Fixing the root cause once is far higher-leverage than fixing each occurrence.

### 1. Emoji used as functional icons everywhere — HIGH
The sidenav is the only place using real icons (`mat-icon`, Material Icon font). Everywhere else — the bottom nav, every login/register page header, checkout radio options, order status chips, dashboard tab icons, empty states, modal headers — uses raw emoji or HTML numeric entities (`&#128276;`, `&#10003;`) as if they were icons: `app.component.html:177-254` (🏪👤📦🔔🏠☰🏛️🚚), `driver-login-page.component.ts:16` (🚗), `checkout-page.component.ts:68-116` (🧑🏢🚚🏪📍✅📞), `hustler-dashboard-page.component.ts:29-32,53` (🧺💰📦🛍🏪), `facilitator-queue.component.ts` (✓✕▲▼📅 throughout), and more. `ui-ux-pro-max`'s Style Selection priority (HIGH impact) explicitly lists "emoji as icons" as an anti-pattern, and `design-taste-frontend` §3.C forbids hand-rolled icon substitutes. This isn't just aesthetic: CLAUDE.md's own mandate is that this app must work on **low-end Android smartphones**, and emoji glyph coverage and rendering vary significantly across cheap-device OEM skins and Android versions — some render as tofu boxes or look completely different, unlike a bundled icon font which renders identically everywhere. **Fix:** adopt one SVG icon set (the sidenav's Material Icons are already loaded — extend that, or add a lightweight set per `design-taste-frontend`'s allowed list) and replace emoji/glyph icons app-wide. Large but mechanical; a good candidate for its own dedicated pass, not a quick fix.

### 2. `transition: all` — eleven instances across nine files
`app.component.css` is clean, but: `community-hub.component.ts:268,564`, `checkout-page.component.ts:162`, `facilitator-queue.component.ts:1017,1052,1093,1100`, `driver-dashboard-page.component.ts:192`, `hustler-dashboard-page.component.ts:776,788`, `register-page.component.ts:82` (dead file, but the pattern is copy-source for others). `emil-design-eng`/`animate` both list this as a "never ship" item: `transition: all` forces the browser to watch every animatable property on the element and risks silently animating layout properties. **Fix:** name the actual properties (`color, border-color, background-color` for these tab/button cases — none of them are animating transform/opacity, so this is a one-line change per occurrence).

### 3. Root cause of most drift: components re-declare local copies of the global tokens instead of using them
`styles.css` already defines `.btn-primary`, `.card`, `.tab-bar`, `.badge-*`, and CSS custom properties for every brand color (`--hustle-yellow`, `--hustle-green`, etc.). But most page/component `styles:` blocks re-declare their own `.btn-primary`, `.card`, `.tab-bar` with hand-typed hex values instead of using the global classes or `var(--hustle-*)`. This is *why* drift keeps happening — every local copy is a place the values can silently diverge:
- **Sign-out button radius drift** (concrete, easy to verify): `facilitator-page.component.ts:39` uses `border-radius: 0.75rem` for `.signout-btn`; the near-identical block in `coordinator-page.component.ts:45` and `operations-page.component.ts:162` uses `border-radius: 999px`. Same button, same text, same three sibling staff pages — one of them drifted. `design-taste-frontend` §4.4 calls this exact pattern out: pick one radius scale and stick to it, or document the exception.
- **Chart legend colors don't match the brand palette two lines above them**: `hustler-dashboard-page.component.ts:257,261` use `#22c55e`/`#f87171` (generic Tailwind green/red) for the income/expense line-chart legend dots, while the financial summary cards three sections earlier (`hustler-dashboard-page.component.ts:751-767`, confirmed against `--hustle-green: #2DB344` / `--hustle-red: #E53935` in `styles.css:17,20`) use the correct brand green/red. A user scanning between the summary cards and the chart on the same tab sees two different greens and two different reds for the same meaning.
- Several components locally redefine `.card`/`.tab-bar`/`.btn-primary` with values that happen to currently match the global ones (e.g. `driver-dashboard-page.component.ts:181,191`) — not wrong today, but every one of these is a place a future edit to the global token won't propagate, and a place someone could hand-edit one copy and miss the others.

**Fix:** this is the single highest-leverage structural change available — migrate component-local `.btn-primary`/`.card`/`.tab-bar` declarations to use the global classes from `styles.css`, and replace hardcoded hex with `var(--hustle-*)`. Not a quick fix, but it would prevent the next ten drift bugs, not just today's.

### 4. Zero use of `prefers-reduced-motion` anywhere in the frontend — MEDIUM
Confirmed by a full-tree search: no file references it. CLAUDE.md's own Design Mandate limits animation to short opacity/transform entrances, which is good, but every design skill that covers accessibility (`ui-ux-pro-max` Priority 1, `emil-design-eng`, `animate`) treats reduced-motion support as something that "ships with the animation every time," not a follow-up. None of the current animations (page-entrance fade/slide, modal pop-ins, bottom-sheet slide-ups) are essential to comprehension, so a single blanket rule would fix this app-wide:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
placed once in `styles.css`, rather than touching every individual `@keyframes` block.

### 5. The custom `app-select` dropdown has no accessibility semantics — HIGH
`app-select.component.ts` is used for every dropdown across the app except one native `<select>` in `facilitator-surveys.component.ts:119` (itself a minor inconsistency — that field-key picker will render with native OS chrome next to custom-styled `app-select`s in the same form). The custom component (`app-select.component.ts:14-65`):
- Has no `aria-expanded` on the trigger button, no `role="listbox"`/`role="option"` on the panel/items, no `aria-activedescendant`.
- Closes on outside click (`@HostListener('document:click', ...)`, line 172) but has no Escape-key handler and no arrow-key navigation between options.
- Never moves focus into the panel when it opens.
A screen-reader or keyboard-only user cannot operate this control at all. It backs the community/business-type/category pickers on the registration form, driver registration, income logging, and the entire facilitator pipeline's community/cohort/rejection-reason selects — this is the single most consequential accessibility gap in the app because of how widely it's reused. **Fix belongs in one file** (`app-select.component.ts`): add `role="combobox"`/`listbox`/`option`, `aria-expanded`, Escape-to-close, and arrow-key movement. Fixing it once fixes every form that uses it.

### 6. The same "product card" concept is implemented three different ways
- `community-hub.component.ts:67-96,309-384` (marketplace grid): aspect-ratio image box, category badge overlay, 2/3-column responsive grid, opens a bottom-sheet detail view with variant options.
- `business-page.component.ts:27-53` (an individual seller's storefront): fixed 160px image height, inline "🛒 Add to Cart" button directly on the card, no detail view.
- `hustler-dashboard-page.component.ts:317-333` (a hustler's own product list): plain `<img>`, overlaid edit/delete icon buttons, no aspect-ratio handling.
None of these visually or behaviorally match. A buyer moving from the marketplace grid to an individual seller's page sees a noticeably different, less polished card for the same kind of object. **Fix:** extract one shared `ProductCardComponent` (community-hub's version is the most complete — closest to a canonical implementation) and use it in all three places, with an input flag for context-specific actions (buy vs. edit/delete).

### 7. Three fully orphaned page components
`register-page.component.ts`, `customer-login-page.component.ts`, and `customer-register-page.component.ts` are not imported by `app.routes.ts` or anywhere else in the codebase — confirmed via `grep -rl` for each class name. Their routes (`/register`, `/customer/login`, `/customer/register`) all redirect to `/login` before the router ever reaches these components. Angular's build won't even bundle them since nothing references them, so this isn't a performance issue — it's a maintenance trap: each duplicates the unified login page's UI with slightly different styling, and a future editor could easily "fix" one of these thinking it's live. **Fix:** delete the three files. Zero risk — nothing points to them.

### 8. Rebrand miss: "HUSTLE" still hardcoded in the hustler dashboard
`hustler-dashboard-page.component.ts:28` — `<div class="rail-brand">HUSTLE</div>` — the desktop sidebar rail label in the hustler dashboard was missed by the thenga.com rebrand commit (`b846189`). Every other page-level branding string was updated; this one wasn't. One-line fix.

### 9. Two conflicting `.offline-bar` definitions — the global one is dead CSS
`styles.css:342-359` defines `.offline-bar` with the brand's orange background and white text (`var(--hustle-orange)`). `offline-banner.component.ts:16-34` defines its own scoped `.offline-bar` with an unrelated amber/brown palette (`#fef3c7` background, `#92400e` text) that doesn't match any token in `styles.css`. Angular's component-scoped styles win in practice, so the global rule never actually renders — it's dead code that also documents an intent (branded orange banner) that isn't what ships. **Fix:** delete the component-local override and let the global `.offline-bar` apply, or if the muted amber is the deliberate choice, delete the dead global rule and add the amber as a real token instead of a one-off hex pair.

---

## Per-screen notes

Screens not listed had no findings beyond the cross-cutting items above, or are covered by them entirely.

**App shell (`app.component.*`)**
- **Blocking-tier accessibility bug, confirmed by contrast math:** `.toolbar-login-btn` (`app.component.css:72-76`) and `.join-hustle-item` (`app.component.css:192-195`) render brand yellow (`#F5B800`) text on a white background. Computed WCAG contrast ratio ≈ **1.8:1** — far below the 4.5:1 minimum for body text and even below the 3:1 minimum for large text. The app already has a safe on-light yellow for exactly this case: `#92620A` is used for `.badge-yellow` text (`styles.css:307`) and `.cat-tag` (`business-page.component.ts:77`). **Fix:** swap both to `#92620A`.
- The sidenav close button (`app.component.html:11`) has no `aria-label`, unlike the hamburger (`aria-label="Open menu"`) and cart (`aria-label="Cart"`) buttons right next to it in the same file. The project already knows to do this correctly elsewhere (it's just missed here, and also present correctly on `hustler-dashboard-page.component.ts:330-331`'s edit/delete buttons) — a one-line fix.
- The redundant-hamburger question is already answered by a comment at `app.component.css:40-42` explaining the mobile/desktop split deliberately — correctly left alone, not a finding.
- The single literal `ease-in` in the whole frontend is here: `app.component.css:291`, the bottom-nav icon's press-release transition. `animate`/`emil-design-eng` both ban `ease-in` on UI motion. Since this is a squish-back-to-rest after a tap (not an entrance), `ease-out` or the strong curve `cubic-bezier(0.23,1,0.32,1)` is the correct swap.

**Login / registration screens**
- `login-page.component.ts` (the live, routed `/login` page) is solid: consistent tokens, 48px inputs, proper focus rings. No findings beyond the cross-cutting ones.
- `driver-login-page.component.ts` and `driver-register-page.component.ts` duplicate the exact same card/input/button CSS block found in the three orphaned customer pages (finding #7) — not currently a visible inconsistency (values are identical), but it means a future fix to one copy (e.g. finding #12 below) has to be applied by hand in up to five places instead of one.
- `driver-register-page.component.ts:164-181`: the licence/ID photo upload shows a local preview but the code comment admits the file is never actually uploaded (`// Without auth token, just store preview... Will be uploaded separately if backend requires it`). This is a **behavior gap, not a visual one** — flagging per the task brief's instruction to separate these, not acting on it.

**Registration form (`registration-form.component.ts`)**
- One of the better-built flows in the app: the terms-and-signature modal correctly gates the submit button behind scroll-to-bottom, has a real success state with a helpful tip pointing at Notifications, and a nice `popIn` entrance curve. No corrective findings; noted as a positive reference for how a multi-step confirmation flow should feel.

**Marketplace (`community-hub.component.ts`)**
- The strongest-built screen in the app: aspect-ratio product images, a well-curved bottom-sheet detail view (`cubic-bezier(0.22,1,0.36,1)` at 220ms, correctly opacity/transform-only), sensible responsive grid breakpoints. Use this as the reference implementation when consolidating the product card (finding #6).
- Checkout's transaction-type labels — "🧑 Personal Purchase (B2C)" / "🏢 Business Purchase (B2B)" (`checkout-page.component.ts:68,71`) — expose internal system jargon (B2B/B2C) to an end customer. `frontend-design`'s writing guidance: name things by what users understand, not by how the system is built. Plain alternatives ("Buying for myself" / "Buying for my business") would read better; keep B2B/B2C only as the underlying stored value.

**Customer orders (`customer-orders-page.component.ts`)**
- Order "number" shown to the customer is a slice of the internal UUID (`order.id.slice(0,8).toUpperCase()`, line 38; same pattern in `hustler-dashboard-page.component.ts:400`). Not a security issue (each party only ever sees their own order's id), but it reads as an arbitrary code rather than a real order number. Low-priority polish item.

**Facilitator / Coordinator / Operations**
- Sign-out button radius drift already covered in cross-cutting finding #3.
- `operations-page.component.ts:331` — the pipeline-stage legend text is `font-size: 0.625rem` (10px), below `ui-ux-pro-max`'s explicit "text < 12px body" anti-pattern threshold and the smallest text found anywhere in the app (everything else in the same file sits at 11px+). Bump to at least 0.75rem.
- `operations-page.component.ts:268-275` defines a `.region-badge` class that is never referenced in the template — dead CSS, harmless but worth removing during any cleanup pass.
- The pipeline-stage bar (`operations-page.component.ts:305-320`) maps seven stages to seven unrelated brand hues (grey/yellow/orange/purple/teal/green/pink) rather than a graduated ramp. It's legible (a title tooltip and text legend accompany it), but a sequential palette (grey → green, red reserved for rejected) would read as *progress* at a glance rather than as decoration. Medium priority, not blocking.
- `facilitator-queue.component.ts` is, correctly, built for staff efficiency over visual expression (`impeccable`'s "Operate" mode: scanability over delight) — the density of nested conditional sections per applicant card (call actions → schedule form → interview form → verification form → account creation, each conditionally shown) is appropriate for the job, not a defect. It shares the cross-cutting `transition: all` instances (lines 1017, 1052, 1093, 1100) and the glyph-icon pattern, but needs no structural rework.

**Driver dashboard**
- Shares the `transition: all` and emoji-icon cross-cutting items.
- `driver-dashboard-page.component.ts:475-483`: proof-of-delivery photo upload is UI-complete (file input, comment shows intent) but never actually uploads — the same **behavior gap** pattern as the driver registration licence photo. Flagging, not acting on.

**Notifications, survey form, barcode scanner, map picker, offline banner, app-select (visual layer only)**
- All functionally solid, mobile-first, 48px touch targets, no corrective findings beyond the cross-cutting items (emoji icons, `app-select`'s missing a11y already covered separately, and `offline-banner`'s color conflict already covered).

---

## Touch targets below the project's own 48×48 mandate

CLAUDE.md sets 48×48px as the minimum; several small controls fall under it. None of these are primary actions, but they're still tappable targets on a mobile-first app:
- `checkout-page.component.ts:143` — quantity stepper buttons, 32×32px.
- `community-hub.component.ts:230-246` — search-clear button, 22×22px.
- `community-hub.component.ts:461-480` — detail-sheet close button, 36×36px.
- `app.component.css:137-141` — avatar upload button, 44×44px (meets the general 44px WCAG-adjacent minimum but not the project's own stricter 48px rule).

Low priority individually — none of these are the primary action on their screen — but worth a pass if the emoji/icon-set rework (finding #1) touches these same buttons anyway.

---

## Explicitly flagged, not acted on (per task brief)

- **Behavior/logic changes**, not visual: driver licence-photo upload never uploads (`driver-register-page.component.ts:174-181`); delivery proof-photo upload never uploads (`driver-dashboard-page.component.ts:475-483`).
- **Role renaming** (Merchant / Community Agent / Hub Coordinator per `CONTEXT.md`): not final, not touched. Nothing in this audit assumes or acts on the new names.
- **The old logo** (`15a6d06d-8e5f-477f-965f-5c33f94a6858.jpg`, referenced at `app.component.html:7,130`): flagged for replacement per `CONTEXT.md` §5, not replaced. Current usages noted, not touched.
- **`CLAUDE.md` "What NOT to touch"**: nothing above proposes touching the 40-product cap, session-token auth, Leaflet/OpenStreetMap, the 60km delivery cap, PII handling, or the `uploads_data` volume.

---

## Prioritized list (cheapest high-impact first)

1. Fix the yellow-on-white contrast failure (`app.component.css:72-76,192-195`) — one-line color swap to the existing `#92620A` token, fixes a real WCAG failure on the two most-visible nav elements in the app.
2. Add the missing `aria-label` to the sidenav close button (`app.component.html:11`) — one line.
3. Fix "HUSTLE" → "thenga.com" in the dashboard rail brand (`hustler-dashboard-page.component.ts:28`) — one line, closes out a rebrand miss.
4. Fix the sign-out button radius drift on the facilitator page (`facilitator-page.component.ts:39`) — one line.
5. Fix the chart legend colors to match the brand green/red tokens (`hustler-dashboard-page.component.ts:257,261`) — two lines.
6. Add a single global `prefers-reduced-motion` rule to `styles.css` — a few lines, fixes an app-wide gap in one place.
7. Delete the three orphaned auth components (finding #7) — pure deletion, zero risk, verified unreferenced.
8. Resolve the `.offline-bar` conflict (finding #9) — pick one definition, delete the other.
9. Name exact properties instead of `transition: all` at the eleven cited locations — mechanical, one line each.
10. Add ARIA semantics and keyboard support to `app-select.component.ts` — one file, but real implementation effort; highest-leverage accessibility fix available since it's reused everywhere.
11. Extract a shared `ProductCardComponent` from `community-hub`'s implementation and use it in `business-page` and the hustler dashboard's product list (finding #6) — larger, multi-file change; do last and as its own scoped task.
12. Replace emoji/glyph icons app-wide with a real icon set (finding #1) — largest item, mechanical but touches nearly every file; best split into its own dedicated multi-session task rather than folded into this list.
