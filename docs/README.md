# thenga.com — Planning & Design Docs

Entry point for the design work currently under review. **If you are an agent (Sandile.Codex, Claude in VS Code, or Claude chat / BA) asked to evaluate or add ideas to the planning, start here.**

These are *specifications for future sprints* — design only, not yet built. Nothing described in them exists in code unless a spec explicitly says "already exists".

## 1. Read for context first
- [`../CLAUDE.md`](../CLAUDE.md) — project rules, stack, roles, and the "what NOT to touch" list. A VS Code Claude Code agent loads this automatically.
- [`../PROGRESS_UPDATE.md`](../PROGRESS_UPDATE.md) — feature history and the "Design specs on deck" index.
- [`../AGENTS.md`](../AGENTS.md) — Sandile.Codex's standing brief and the review workflow.

## 2. Specs open for review

**Start with [`THENGA_PLATFORM_PLAN.md`](THENGA_PLATFORM_PLAN.md).** It records Sandile's 2026-10-09 decisions (final role names, one phone-identified account with Shopping/Selling modes, agent-verified merchant onboarding, drivers as their own role, Shop / Sell / Drive / Back office) and the phased work. It overrides anything older below where they conflict: "Facilitator-Seller" in the older specs is now **Community Agent**.

| Spec | What it covers |
|---|---|
| [`THENGA_PLATFORM_PLAN.md`](THENGA_PLATFORM_PLAN.md) | Decisions D1 to D13, open questions, keep/transform/retire for every screen and API area, phases with owners. |
| [`FACILITATOR_SELLER_SPEC.md`](FACILITATOR_SELLER_SPEC.md) | Paid Facilitator-Seller (now Community Agent) earnings ledger + payouts. **On the shelf:** out of scope for now per the platform plan (D13). |
| [`LAST_MILE_DELIVERY_SPEC.md`](LAST_MILE_DELIVERY_SPEC.md) | Last-mile parcel relay — local drivers bridge the gap national couriers won't (Mkuze depot → rural home). Hub-logged parcels, multi-drop trips, cash-on-delivery zone tariffs. Has 7 open questions. |
| [`MARKETPLACE_DESIGN_PROPOSAL.md`](MARKETPLACE_DESIGN_PROPOSAL.md) | Redesign of the marketplace browse screen and product card — seller trust signal, locality/community filtering actually wired up, a real search-reactivity bug fix, contrast fixes, mobile/desktop wireframes, and a logo-simplification option. Authored by Sandile.Codex; senior response and Sandile's direction recorded in §10. Status: built 2026-09-28. |

The Facilitator-Seller and Last-Mile specs are interlocking: hubs in the delivery spec are run by the Facilitator-Seller layer, and both parcel fees and facilitator earnings settle through the **same** ledger/payout machinery. The Marketplace Design proposal is independent of both.

## 3. How to give feedback or add ideas
1. Read the relevant spec end-to-end, including its **"Open questions for Sandile"** section (that's where the design is genuinely undecided and input is most valuable).
2. Append **attributed, dated notes** to that spec's **"Reviewer feedback & additional ideas"** section at the bottom — format `**<who>, <date>:** <note>`. Do **not** rewrite the spec body; the senior consolidates.
3. Disagree with evidence; propose additions freely. Flag anything that conflicts with `CLAUDE.md`'s "what NOT to touch" list.
4. Decisions that result from the discussion are recorded by the senior in [`../CODE_REVIEWS.md`](../CODE_REVIEWS.md) — the joint-decision log for the project.
