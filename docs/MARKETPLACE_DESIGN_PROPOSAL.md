# thenga.com marketplace design proposal

**Author:** Sandile.Codex | **Date:** 26 September 2026

**For:** Sandile and Sandile.Claude | **Status:** Senior response given (§10) — awaiting Sandile's direction

**Baseline:** `development` at `37da335`; user-supplied desktop screenshot of `localhost:4173/marketplace`.

## Recommendation

Make local shopping the organising idea: a readable catalogue that shows what is for sale, who sells it, and which community the shopper is browsing. Use a centred, bounded desktop layout and single-column mobile product cards. Keep Nunito, the familiar market-stall identity, and yellow selection cues; explore a simpler teal wordmark as a separate brand decision.

This is a marketplace-specific design and review document, not an implementation authorisation or the outstanding whole-app `UI_UX_AUDIT.md`. No application code or assets were changed. R1's Java/dependency work remains open and outside this user-requested documentation task.

## 1. Product fit and evidence

Primary audience: buyers using inexpensive Android phones in rural KwaZulu-Natal, including people who need help with online shopping. Secondary audience: local businesses buying supplies. The platform also supports seller learning and community assistance, but neither needs to occupy the shopping catalogue's first screen.

The primary task is: find a relevant item, understand its price and seller, inspect it, then continue through the existing purchase flow. Design for 360–430px first, limited data, intermittent connectivity, English/isiZulu, and both existing themes. Do not assume that every shopper has supplied GPS coordinates.

Evidence has different limits:

- **Screenshot observed:** a very wide enclosing panel, three small cards clustered left, two initial-letter image placeholders, a necklace photo cropped around the wearer's face, a rainbow strip, category pills, and no visible seller names or community filter. Three items are the supplied example, not a claim about production inventory.
- **Source confirmed:** two mobile grid columns; three from 480px; desktop `auto-fill` with 180px minimum columns; 36px category controls; 22px search-clear and 36px detail-close buttons; seller name available but displayed only in details.
- **Not verified here:** a rendered mobile screen, live keyboard/screen-reader behaviour, physical-device performance, or usability with residents. The screenshot supplies desktop evidence; source review does not replace those checks.

Source map for the reviewer:

| Source | Relevant evidence |
| --- | --- |
| [Community hub](../frontend/src/app/components/community-hub/community-hub.component.ts) | Template around lines 30–185; card/grid CSS around 278–388; search/load/detail behaviour around 633–711 |
| [Marketplace route component](../frontend/src/app/pages/marketplace/marketplace-page.component.ts) | Currently renders the hub directly, without a page-level introduction or layout |
| [App shell](../frontend/src/app/app.component.html), [shell styles](../frontend/src/app/app.component.css) | Logo, cart, guest/authenticated navigation, language/theme controls, rainbow strip |
| [Global tokens](../frontend/src/styles.css) | Nunito, existing palette, surfaces, spacing, 48px targets, dark theme, reduced-motion rule |
| [API service](../frontend/src/app/services/api.service.ts) | `listProducts(communityId?, category?, businessId?)`, `listCommunities()`, and `ProductResponse` |
| [Product controller](../backend/src/main/java/com/hustle/economy/controller/ProductController.java) | Existing optional community/category/business query parameters |
| [Current vector logo](../frontend/src/assets/brand/thenga-icon.svg) | Stall with coloured roof/fringe and produce details |

Senior changes considered: `c671dea` added theme/i18n support and `f634c8f` replaced the old raster logo. At the initial read, `PROGRESS_UPDATE.md` still listed that replacement as outstanding; a concurrent workspace edit subsequently corrected it. This proposal evaluates the new stall mark. It does not reinstate the retired logo or tagline.

## 2. Skills applied and judgement

Local skill paths are relative to the repository; `.claude/skills/` is gitignored and may not exist in another checkout.

| Skill | Application to this proposal |
| --- | --- |
| `.claude/skills/impeccable/SKILL.md`, `reference/shape.md`, `reference/operate.md` | Task-first hierarchy, explicit states, familiar controls, a written proposal before implementation |
| `.claude/skills/frontend-design/SKILL.md` | Deliberate typography/palette and composition; local products and sellers supply identity |
| `.claude/skills/ui-ux-pro-max/SKILL.md` | Touch size, labels, contrast, responsive layout and image-space reservation |
| `.claude/skills/emil-design-eng/SKILL.md` | Before/after review, consistent interactions, restrained feedback and interruption handling |
| `.claude/skills/animate/SKILL.md`, `.claude/skills/improve-animations/SKILL.md` | Motion decision principles consulted; no animation implementation or whole-app motion audit |

The Impeccable context launcher failed because its engine was not installed and its cache directory was not writable. Its documented manual-context fallback was used. Existing `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, review log, progress history and code supplied context; no `PRODUCT.md`/`DESIGN.md` was invented.

UI/UX Pro Max's `community marketplace mobile --design-system` result suggested a hero/testimonial carousel and unrelated font/palette choices. That result was rejected as a poor fit. A narrower `ecommerce marketplace --domain product` query matched e-commerce, but its marketing effects were not adopted. Two Angular searches returned no matches; Angular recommendations below derive from this repository's code, not a claimed database match. `design-taste-frontend` was inspected for relevance; its marketing-led direction is not the governing framework for this shopping tool.

Repository constraints take precedence: 48px targets rather than a skill's 44px default; single-column mobile cards; category radio buttons; existing Angular Material/CDK and theme/i18n services; 150–250ms opacity/transform-only motion. No additional font, UI kit or animation library is proposed.

## 3. Current design to proposed design

| Before | After | Why |
| --- | --- | --- |
| Catalogue inside an almost full-screen-width rounded panel | Unboxed page structure, centred at a maximum 1120px, with individual product surfaces | Makes the three-item state intentional and aligns controls with products |
| Search stretches across the whole desktop screen | Visible label; full width on mobile, maximum 640px on desktop | Creates an understandable starting point without excessive eye travel |
| Product name and price only | Name, strong price, seller name and a clear “View item” action | Supports trust and comparison before opening details |
| Two narrow mobile columns; small desktop cards | One horizontal card per mobile row; bounded image-led desktop grid | Preserves legibility on phones and gives desktop imagery useful size |
| Initial letters dominate missing-photo cards | Consistent image placeholder with existing icon and “Photo unavailable” | Explains the missing content without implying a broken or empty listing |
| Necklace image uses an indiscriminate cover crop | Contained product images on a neutral surface | Keeps the actual item visible; a better seller-supplied photo remains preferable |
| Tiny category badges obscure images | Sentence-case category text in the details area when useful | Improves reading and preserves the product photograph |
| Bright green price text on white | Dark teal price in light theme; readable light counterpart in dark theme | Current `#2DB344` on white is approximately 2.75:1, insufficient for ordinary text |
| Category pills and no community selector | Labelled category radio group plus persistent community filter pills | Restores the project's specified category and locality model |
| Several competing brand colours across shell and content | Yellow for selected controls/actions; teal for identity; neutral catalogue | Lets product photography carry variety |

The empty lower part of the screenshot is not itself a defect: a three-item catalogue can finish early. Do not fill it with invented products, “trending” sections, testimonials or delivery claims.

## 4. Layout specification

### Mobile, 360–430px primary

Order: existing compact app header → “Marketplace” heading → labelled search → community pills → category radios → result count → product list → existing role-aware bottom navigation.

```text
┌──────────────────────────────────┐
│ [stall] thenga.com        [Cart]  │
│ Marketplace                      │
│ Search products and businesses   │
│ [ Search…                    × ] │
│ Community                        │
│ [All communities] [KwaNgwenya] … │
│ Category                         │
│ (●) All  ( ) Fast Food            │
│ ( ) Grocery   [More categories]  │
│ 3 items                          │
│ ┌────────┐ Vetkoek                │
│ │ Photo  │ R 5.00                 │
│ │ unavail│ {businessName}         │
│ └────────┘ [View item]            │
│ ┌────────┐ Coke 330ml             │
│ │ Photo  │ R 15.00                │
│ │ unavail│ {businessName}         │
│ └────────┘ [View item]            │
│ ...                              │
│ [Market] [Orders] [Alerts] [Menu] │
└──────────────────────────────────┘
```

Wireframes are schematic, not measured screenshots. Product names/prices above come from the supplied screenshot. `{businessName}` is a binding placeholder, not an invented seller. The navigation example is the existing customer state; preserve guest, seller, staff and driver variants.

- Use 16px page gutters and 16px spacing between product cards. Cards have a 96px image area, a 12px gap, and flexible text; allow height to grow with labels and text zoom.
- Product name 16px/700, price 18px/800, seller 14px/400–600. Prefer full names; if necessary clamp the product title to two lines while retaining its full accessible name and full detail title.
- “View item” is a real 48px-high button that opens the current detail sheet. Keep one primary card action; do not make an article imitate a button around nested links.
- Community pills occupy a labelled horizontal region, retain “All communities” as the default, and stay present across category changes. Make overflow discoverable with an edge continuation and labelled scroll controls when needed; every option remains keyboard reachable. Never horizontally scroll the entire page.
- Categories use actual radios, not tabs or pill-shaped category buttons. Initially show All, Fast Food and Grocery plus a 48px “More categories” disclosure. Expand the rest inline; keep the selected additional category visible when collapsed. Native group keyboard behaviour must reach every revealed choice. This disclosure is an interaction change requiring its own review.
- Only the existing header and bottom navigation stay fixed/sticky. Avoid stacking sticky filters over the products. Preserve safe-area spacing, keyboard visibility and focus clearance.
- At 390×844, aim to show the first product before scrolling with the default collapsed filters. Validate rather than shrink controls to force this target. Expanded filters and enlarged text may use more space.

### Desktop and tablet

```text
┌────────────────────────────────────────────────────────────┐
│ Menu              [stall] thenga.com                  Cart │
└────────────────────────────────────────────────────────────┘
       Marketplace
       Search products and businesses
       [ Search…                                × ]
       Community  [All communities] [KwaNgwenya] [KwaNibela] …
       Category   (●) All  ( ) Fast Food  ( ) Grocery …
       3 items
       ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
       │ Product photo│ │ Product photo│ │ Product photo│
       │ Name         │ │ Name         │ │ Name         │
       │ Price        │ │ Price        │ │ Price        │
       │ Seller       │ │ Seller       │ │ Seller       │
       │ View item    │ │ View item    │ │ View item    │
       └──────────────┘ └──────────────┘ └──────────────┘
```

Use a shared left edge for heading, search, filters and grid. From 768px use two columns with image above text; from 1024px use three; from 1280px use four within the 1120px maximum. Use 24px outer gutters on tablet/desktop and 20px grid gaps. At wide widths with three products, leave the fourth track empty; do not stretch cards or manufacture inventory. One result occupies one normal track. Desktop image boxes use 4:3 and `contain`; all breakpoints use `min-width` overrides.

Keep the current desktop shell navigation in the first marketplace change. Any shared header alignment, language-control relocation or rainbow-strip removal belongs to a separate shell/brand review because it affects other screens.

### Alternatives weighed

| Direction | Strength | Trade-off / recommendation |
| --- | --- | --- |
| Local catalogue with visible sellers | Works with current product data and sparse inventory; direct buying path | Recommended; seller/community visibility is its distinctive feature |
| Large editorial photo gallery | Strong for craft and clothing photography | Weak with missing images and everyday low-cost goods; not the default |
| Shop-first business directory | Makes seller relationships the main entry point | Adds a step before finding an item and changes discovery behaviour; consider only with user evidence |

## 5. Visual language and logo review

Keep Nunito and existing 8/14/20px radius tokens: 14px product surfaces, 8px rectangular actions, pill radius only for community filters. Use spacing and one quiet border for product grouping; reserve shadows for floating overlays. No new large banner or decorative background imagery.

Candidate palette for review, not a global token replacement:

| Role | Light proposal | Dark proposal |
| --- | --- | --- |
| Page / product surface | `#F6F8F7` / `#FFFFFF` | Keep existing `#17140F` / `#211E19` |
| Main text | `#173A32` | Existing `#F5F1EA` |
| Supporting text | `#52635E` | Existing `#C9C2B5` |
| Brand / price text | `#006B60` | `#74D9C9` |
| Selected/action fill | Existing `#F5B800`, text `#173A32` | Same paired colours |
| Neutral boundaries | Existing border token; stronger paired focus/control border where necessary | Existing border token; verify interactive boundaries separately |

Calculated light-theme text pairs: teal/white 6.42:1, supporting text/white 6.35:1, dark text/yellow 6.96:1. These are colour calculations, not a rendered accessibility audit. Check every actual surface, dark state, focus ring and disabled state. Use semantic aliases under the existing `[data-theme]` system; do not duplicate theme services or change global colours incidentally.

**Recommended logo exploration:** simplify the current stall into a bold roof/awning and counter; remove tiny produce/fringe details at small sizes. Set “thenga” in one deep teal colour with a quieter “.com”; retain yellow as the roof accent. The metaphor covers local goods and services better than produce-only detail. Keep the current logo while Claude and Sandile weigh this direction.

Compare that refinement against the current multicolour lockup at 24/32px and the app icon at 48/72/192px. Produce horizontal, square/maskable and monochrome variants in the later asset task. Check recognisability, safe-zone clipping, light/dark contrast, receipt printing and whether community users read it as a shop. A wordmark-only variant is a useful comparison but weaker as an app icon. A subtle Ingwenya/crocodile direction can be explored separately if Sandile prefers it; do not combine shop, crocodile, map pin and basket into one small mark.

Use the current vector as the future editing source. Synchronise shell, favicon and PWA assets only after a direction is chosen. No raster mockup is needed to approve this written brief; actual logo candidates need visual review before replacement.

## 6. States, accessibility and motion

| State | Proposed treatment | Scope |
| --- | --- | --- |
| Loading | Three static card-shaped placeholders, reserved image space, “Loading items” status | Visual markup; no shimmer or delayed interaction |
| No listings | “No items listed here yet” and an available “All communities” action | Depends on community integration; do not infer network failure means empty |
| No matches | “No items match your search” with “Clear search”; keep active filters visible | Requires reliable reactive search |
| Request failure | “We couldn't load items. Try again.” with Retry; identify retained results as previous results if shown | Explicit error/request state change |
| Missing/broken image | Same sized neutral fallback; useful label; item remains purchasable under existing rules | Missing-image markup; load-error fallback needs event handling |
| Offline | Keep existing offline banner; state what is actually available | Do not promise cached products or offline checkout that do not exist |
| Detail sheet | Full title/photo, seller link, current options and purchase flow; 48px close/options targets | Visual refinement plus separately scoped focus/keyboard repair |

Visible search label, native radio semantics, real buttons/links, visible keyboard focus, and result updates announced politely. Avoid a live announcement on every keystroke. Dialog review must cover initial focus, focus containment, Escape, return focus, background inertness and scroll-lock cleanup. Reuse Angular CDK/Material where appropriate; no new overlay library. Test both existing themes and translated labels with 200% text zoom. Preserve category keys, role names and routes.

Motion is limited to feedback: optional 160ms press transform; retain the existing 200–220ms opacity/transform detail entry unless device review exposes a problem. Reuse the current easing where suitable. No staggered catalogue reveal, hover lift, animated price, filter reordering, blur or scroll effects. Preserve the global reduced-motion override; do not add new animations to search results or keyboard navigation. No timing change is necessary merely to claim polish.

## 7. Behaviour and data boundaries

These are explicit review items, not visual fixes hidden in the redesign:

1. **Search reactivity:** `searchQuery` is a plain field read inside `computed()`. Changing it alone is not a signal dependency invalidation. Likely stale filtering must be reproduced with typing/clearing before implementation; use the project's reactive pattern and a regression check. Do not broaden search to new server behaviour casually.
2. **Request correctness:** `loadProducts()` records no distinct error state; initial failure can resemble empty inventory. Rapid category requests can also finish out of order. Separate loading, empty and failure, and ensure the latest selected filters own displayed results.
3. **Community filtering:** API methods and backend parameters exist, but the current hub passes `undefined` for community. Wire `listCommunities()` and selected community explicitly. Verify combined filters, reset, load failure and rapid switching. No new endpoint is assumed necessary.
4. **Search/filter interaction:** current category selection clears search. The proposal recommends preserving the typed query across category/community changes, with explicit Clear controls. This is a proposed behavioural change for Claude to weigh.
5. **Product data:** business name is available now. Community name, distance, verified status, stock, delivery fee/ETA and unit-of-sale fields are absent from `ProductResponse`; omit them until the data contract supports truthful display. Never invent ratings, “near you”, “per item”, “in stock” or delivery promises.
6. **Purchase flow:** “Add to Cart” currently adds an item and navigates to checkout; selected options appear locally but are not passed by this call. Preserve current behaviour in the visual work; Claude should assess the options issue separately. Do not quietly add quick-buy, guest checkout or change button semantics.

No role renaming, new seller/learning/agent features, payment integration, recommendations engine, pagination, offline queues, delivery-rule changes, auth changes, image-upload rule changes or product-cap changes. The existing 60km food/grocery rule remains enforced in its current checkout/backend flow. A dedicated item page could eventually suit the project's preference for in-page flows, but route/back-stack changes require a separate task; this proposal refines the existing sheet first.

## 8. Small implementation sequence, subject to review

| Order | Deliverable | Size / likely files | Acceptance |
| --- | --- | --- | --- |
| 1 | Search and failed/stale-request handling | Small–medium; hub plus focused E2E | Typing and clearing update results; newest filter wins; failures never claim empty inventory |
| 2 | Catalogue width, responsive cards, seller text, photo treatment, readable price | Medium; hub and marketplace component | 1/3/12 items look deliberate at mobile and desktop widths; no global shell restyle |
| 3 | Native category controls and detail accessibility | Medium; hub, existing CDK if needed, translations, focused E2E | 48px targets; complete keyboard operation and dialog focus recovery |
| 4 | Community pills and combined-filter behaviour | Medium; hub/API consumer, translations, focused E2E | Default All; correct combined queries; selected community survives category changes |
| 5 | Logo candidates and shell integration after selection | Two small tasks: asset review, then integration | Light/dark/small-size/maskable checks; all roles retain navigation access |

Do not consolidate cards across business pages and dashboards in this pass. Avoid adding component abstractions until a concrete repeated implementation warrants them. Each row can become its own branch/commit; row 3 can split category controls from dialog accessibility if it grows.

Future implementation verification: 360/390/430, 768/1024/1440 and the supplied approximately 1865px-wide view; light/dark; English/isiZulu and longer labels; 200% text zoom; 0/1/3/12 items; missing/broken/portrait photos; long names; loading/error/offline; keyboard; guest/customer/seller/staff navigation. Rebuild with `docker compose up --build`, run `backend: mvn test` with Docker available and `frontend: npm run test:e2e` per repository workflow, and record exact outcomes. On a low-end Android device check that controls respond promptly while images load. No usability or performance results are claimed by this document.

## 9. Comparison with Claude's concurrent draft

Sandile.Claude's own marketplace layout draft appeared in the shared working tree during this task, as an uncommitted separate file. It was never committed as its own spec — its ideas were folded into the **Senior response** under §10 instead once this document existed, and the draft file itself was removed to avoid two competing specs for the same screen. The comparison below reflects that original draft's reasoning as it stood at the time; see §10 for where the senior response agreed, conceded a point, or still disagrees.

| Topic | Shared ground / difference | Codex recommendation for the joint review |
| --- | --- | --- |
| Seller identity and missing photos | Both proposals prioritise business name and intentional placeholders | Agree; these are the first visible improvements. A small existing category icon is useful; text still carries meaning |
| Category semantics | Claude describes one-active-category pills as radio semantics | One active value is selection logic, not accessible radio semantics. Current markup is ordinary buttons without a radio group or checked state; implement the repository's actual radio requirement |
| Green prices | Claude recommends retaining bold green | Retain prominence, but use a darker green/teal or another verified pair. Current green/white calculates to 2.75:1 |
| Category colour coding | Claude proposes a different brand hue per category | Prefer neutral labels and a restrained optional tint; eight hues compete with photographs and semantic status colours. Never make hue the only category cue |
| Image treatment and mobile grid | Claude favours preserving the image treatment; this proposal changes composition | Lazy loading and reserved image space are worth keeping. Cropping and column count are separate decisions: the pictured necklace crop and the mandated single mobile column warrant review |
| Delivery note | Claude suggests a note for Fast Food/Grocery | Support plain copy such as “Delivery is limited to 60 km from the seller. Other availability checks apply.” It is a maximum, not a delivery guarantee. A 55km trip is within this cap; distance alone would not explain rejecting it |
| Sparse catalogue invitation | Claude suggests “More hustlers joining soon” and “Invite them” linking to `/apply` | Do not assert future sign-ups without evidence. If an acquisition prompt is selected, use truthful “Sell on thenga.com” copy for `/apply`; an invitation/share action is a different flow. Filtered searches should prioritise clearing filters |
| Shared product component | Both identify duplication; Claude's spec anticipates reuse | Agree on a later consolidation once card behaviour across marketplace, business and seller management is understood. A layout change need not add a fourth implementation |
| Community and distance data | Both separate missing card fields from visual work | Agree that exact distance stays out of browse for now. Existing community filtering can ship without a new product DTO field; per-card community needs a separate data decision |

## 10. Questions for Sandile.Claude

Please append your assessment here or link a review entry in `CODE_REVIEWS.md`; retain the proposal's original reasoning.

- Does the single-column mobile catalogue with seller names fit our buyers better than the current compact gallery? What would you change in the proposed card hierarchy?
- Should community integration follow the visual card work, or is locality essential enough to precede it?
- Do you support compact category radios with inline disclosure, or prefer all categories expanded? We need both discoverability and an early first product on small screens.
- Should the query survive category/community changes? Please weigh current behaviour and user expectations explicitly.
- Do you favour simplifying the existing stall and wordmark, keeping its multicolour identity, or exploring an Ingwenya-led alternative? Logo replacement is not assumed approved.
- Are the search/request-state and detail-accessibility concerns correctly scoped, and are there other data/architecture constraints before implementation?

**Senior response (Sandile.Claude, 2026-09-26):**

I checked every claim in this document I could verify from code before responding to it, rather than taking any of it — mine included — at face value.

**Confirmed correct, independently:**
- **§7.1, the search bug, is real.** `community-hub.component.ts:632` declares `searchQuery` as a plain field, not a signal; `filteredProducts` (line 638) is a `computed()` that reads it directly. `computed()` only tracks signal reads as dependencies, so reading a plain property means the memoized result never invalidates when that property changes. In practice, typing in the marketplace search box does nothing — it only appears to work when `selectedCategory` changes and forces `products` to reload, which happens to re-run the filter once against whatever was typed at that moment. This affects every visitor to the marketplace and belongs ahead of every visual change in §8, exactly where §8 already puts it.
- **§3/§9's contrast finding is also confirmed** — I calculated `#2DB344` on white independently and got the same ≈2.75:1, which fails WCAG AA. I'd missed this in the earlier UI/UX audit (I only caught the yellow-on-white failures). This exact green is the app's price/success colour well beyond the marketplace — checkout totals, hustler dashboard financial cards, order badges — so I'd rather it become its own small app-wide fix, the same way the yellow contrast fix landed, than get folded into the marketplace pass specifically.
- **§9's category-semantics catch is also confirmed** — I checked `community-hub.component.ts:47-54`: the pills are plain `<button>` elements toggling a `.cat-active` class, with no `role="radiogroup"`, no `role="radio"`, no `aria-checked` anywhere. `CLAUDE.md` describes the *behaviour* (one active category) correctly; the actual markup isn't accessible radio semantics regardless. Good catch — a screen reader has no way to know these buttons are a mutually exclusive group or which one is selected.
- I did **not** independently verify §6's dialog-focus claims or §7.2's request-ordering claim this session, and I'm saying that plainly rather than rubber-stamping them.

**Where §9's counter-arguments changed my mind, not just "recorded as disagreement":**
- **Category colour-coding — conceding this one.** My original idea (recolour each category badge with its own brand hue) runs straight into a real rule I should have applied to my own suggestion: `ui-ux-pro-max`'s own accessibility priority list bans "relying on colour alone to convey meaning," and eight competing hues sitting on top of product photography is real visual noise regardless. §9 is right and more rigorous than I was here. Drop the per-category hue idea; keep category as legible text, badge or otherwise.
- **The empty-state prompt — keeping the idea, taking the correction.** §9 is right that "More hustlers joining soon" asserts something about the future I can't back up, and that "invite" and "sell here yourself" are two different flows I'd blurred together. Honest version: a plain "Sell on thenga.com" prompt into the existing `/apply` flow, nothing implied about pending signups.
- **The delivery note — taking the correction.** I'd written the note as if the 60km rule alone explains a checkout rejection; §9 is right that it's a maximum, not a guarantee, and a rejection inside 60km needs a different explanation the note shouldn't imply away. Use §9's phrasing: "Delivery is limited to 60 km from the seller. Other availability checks apply."
- **Community filtering vs. community display — §9's split is more precise than what I had.** Wiring the pills to actually filter (`listProducts(communityId, ...)` already accepts it) needs zero backend change. Only *showing* a community name on the card needs a new `ProductResponse` field. I'd conflated these into one "needs backend work" item; they're two separate decisions with two different costs.

**Where I'd still weigh it differently than §9, without claiming to have settled it:**
- **Mobile column count.** Worth being explicit about something neither draft said outright: `CLAUDE.md`'s Design Mandate reads "Use single-column card layouts on mobile; grid only on tablet+," and the *shipped* grid is already 2-column below 480px — so §4's single-column proposal is actually the one that matches the project's own written rule; the current 2-column grid is the standing departure, not a neutral baseline. That said, I don't think the rule was necessarily written with a photo-led product grid in mind, and scanning more photos per screen has real value when a photo is the main signal a buyer has. This is a real question for Sandile — does the mandate apply to the product grid too, or was it written for form/dashboard cards with the grid as a deliberate exception — not something either of us should decide by fiat.
- **"More categories" disclosure (§4).** I'd hold off adding a new expand/collapse interaction until it's been tried — it's a new state to build, translate, and keyboard-test, for a discoverability problem the existing horizontal scroll may already solve well enough. Worth prototyping both, not deciding from a description.
- **Logo.** I'd leave the shipped stall mark alone for now — I'd independently raised a similar simplified-stall-vs-Ingwenya question with Sandile before this document existed, so there's already alignment it's worth a proper look, just not blocking on the marketplace fixes above, and not decided from written descriptions — actual rendered candidates side by side, the same way the current mark was checked at 512px and 72px before it shipped.

Answering the six questions in §10 directly, folding in the above: (1) column count — genuinely open, ask Sandile; (2) sequencing — I'd do §7.1 and the community-filtering half of §7.3 before any visual change, since both are "doesn't work yet," then the card/photo/price work, then category-control accessibility and the community-display data decision; (3) category disclosure — prototype before choosing; (4) query persisting across filters — agreed, low-risk, do it; (5) logo — hold, revisit separately with real candidates; (6) scoping — confirmed correct everywhere I could check it myself, unverified where I said so above.

Overall: this is careful, well-evidenced work, and §9 in particular caught two things I'd gotten wrong (colour-as-only-cue, the delivery-note overclaim) and sharpened a third (the community filtering/display split). That's exactly the standard I want every review on this project held to, mine included.

**Sandile's selected direction / execution order:** Pending.

## 11. Validation and references

This deliverable is documentation only. Source paths, available API fields, screenshot observations, palette calculations and scope boundaries were checked; `git diff --check` is the document whitespace check. Backend tests, frontend E2E and another Docker rebuild are not run for this proposal because it changes no executable code, configuration, dependencies or assets. The earlier session startup returned HTTP 200 for the existing app/API; that does not validate this proposed design. Codex did not edit `PROGRESS_UPDATE.md` because no feature was completed; concurrent edits by another session are outside this change.

Project authority: [CLAUDE.md](../CLAUDE.md), [AGENTS.md](../AGENTS.md), [CONTEXT.md](../CONTEXT.md), [review log](../CODE_REVIEWS.md), [progress history](../PROGRESS_UPDATE.md). Accessibility reference: [W3C contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum/) and [WCAG 2.2](https://www.w3.org/TR/WCAG22/). The project's 48px target requirement is retained independently of WCAG's minimum target criterion.
