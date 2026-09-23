# Task for Sandile.Codex — thenga.com UI/UX Audit (Phase 0: audit only, no code changes)

Read `AGENTS.md`, `CLAUDE.md`, and `CONTEXT.md` in full before starting if you haven't this session. This task follows all of their rules; this file only adds the specifics for this piece of work.

## Why this is an audit first, not a redesign

Sandile asked for the UI/UX of the entire app to be improved. That's the right goal, but `AGENTS.md` rule 10 says keep changes small and reviewable, and `CONTEXT.md` §10.4 says scope your tasks tightly. A whole-app redesign in one pass would be an unreviewable diff. So this task has two phases:

- **Phase 0 (this task):** audit every user-facing screen against the installed design skills, and produce a single prioritized, written plan. **No code changes.**
- **Phase 1+ (later, separate tasks):** each fix from the plan becomes its own small branch and commit, approved one at a time. Do not start Phase 1 work under this task.

## Tools: the installed design skills

Seven design skills are installed at `.claude/skills/` on this machine (gitignored — local disk only, not in git, so they travel with this machine's checkout, not with a fresh clone):

- `impeccable` — general interface critique/audit framework: hierarchy, IA, cognitive load, accessibility, responsive behavior, anti-patterns, typography, spacing, color, motion, UX copy, error/empty states.
- `frontend-design` — aesthetic direction, typography, avoiding templated/generic defaults.
- `design-taste-frontend` — anti-slop audit lens for redesigns specifically.
- `ui-ux-pro-max` — style/palette/font-pairing/UX-guideline reference data.
- `emil-design-eng` — UI polish, component design, and "invisible detail" philosophy.
- `animate` / `improve-animations` — motion-specific: `improve-animations` is itself an audit-then-plan skill, which is the model this whole task follows.

Read each `SKILL.md` before starting. If your tool doesn't have a `Skill`-invocation mechanism the way Claude Code does, just read the markdown files at those paths directly and apply their frameworks manually — they're plain instructions, nothing Claude-specific in the content itself.

## Scope: every user-facing screen

Walk `frontend/src/app/pages/` and `frontend/src/app/components/` and cover all of it, including at minimum: marketplace, business detail page, login/register, checkout, customer orders, hustler dashboard (income, products, POS/barcode, orders tabs), facilitator queue + applicant pipeline, coordinator, operations, driver dashboard + login + register, survey form, notifications, offline banner, map picker.

## What to produce

One markdown file: `docs/UI_UX_AUDIT.md`. For each screen:

1. **Current state** — one or two sentences, no code excerpts.
2. **Specific problems** — concrete, not "make it better." Cite what's wrong against `CLAUDE.md`'s mobile-first mandate (360–430px primary viewport, 48px touch targets, single-column mobile layout, `min-width` overrides only, 150–250ms opacity/transform-only motion) and the skills' criteria (hierarchy, typography, spacing, color, IA, accessibility, templated/generic look, polish/detail).
3. **Concrete fix** — specific enough that someone else could implement it without re-auditing.
4. **Size estimate** — rough: small (one component, one sitting), medium (one page), large (spans several files/pages). Anything you'd call large should usually be broken into smaller fixes in the plan.

Then a **single prioritized list** across all screens, ranked by user impact versus effort, cheapest high-impact fixes first.

## Explicitly flag, do not act on

- Anything that would require a **behavior or logic change**, not just visual/markup/CSS — call these out separately. This task and its Phase 1 follow-ups are visual/UX only.
- Anything that would touch `CLAUDE.md`'s "What NOT to touch" list.
- Anything that would rename a role, route, or entity toward `CONTEXT.md`'s pending naming (Merchant / Community Agent / Hub Coordinator) — that naming is **not final**, do not act on it.
- The current logo. `CONTEXT.md` §5 flags it for replacement — note where it's used, don't replace it.

## Hard constraints

- No code changes in this task. Audit and plan only.
- Work on `development` or a `feature/*` branch per `AGENTS.md`.
- Commit message: `docs: UI/UX audit using installed design skills`, with the `Co-Authored-By: Codex <codex@openai.com>` trailer.
- Don't edit `CLAUDE.md`, `AGENTS.md`, or `CONTEXT.md` to make anything in this task easier — if a rule seems to block a finding you want to make, note it under the finding instead.

## After this task

Sandile.Claude reviews the audit in `CODE_REVIEWS.md`. Sandile picks the execution order. Each approved fix then becomes its own small, scoped task — never the whole app in one diff.
