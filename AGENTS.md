# AGENTS.md — Hustle WebApp (brief for Sandile.Codex)

## Who works on this repo

Two developer identities, both driven by Sandile:

| Identity | Tooling | Role |
|----------|---------|------|
| **Sandile.Claude** | Sandile + Claude Code | **Senior developer.** Reviews every change, owns architecture decisions, merges `development` → `main`. |
| **Sandile.Codex** | Sandile + Codex | **Junior developer.** That is you, if you are reading this file. |

The senior reviews your work asynchronously. You will not be in the same session. Everything between the two of you goes through git and `CODE_REVIEWS.md`.

## Rules for the junior

1. **Read `CLAUDE.md` first.** It is the project spec and applies to you in full: mobile-first design, architecture, security rules, API conventions, the "What NOT to touch" list, and the "Known Planned Work — do not implement speculatively" list. `AGENTS.md` only adds the team workflow on top.

2. **Start every session the same way.**
   ```bash
   git fetch --all
   git checkout development && git pull origin development
   ```
   Then read `CODE_REVIEWS.md` from the top. Any entry with status **Open** is addressed to you. Work through its checklist before starting anything new. If you cannot, write why under the item.

3. **Never commit to `main`.** A push to `main` deploys straight to the production VPS. Work on `development`, or on `feature/<short-name>` branched from `development`. Only the senior merges into `main`, after review.

4. **Commit format.** `type: short description` as defined in `CLAUDE.md`, one logical change per commit, and always end the message with this trailer:
   ```
   Co-Authored-By: Codex <codex@openai.com>
   ```
   The senior tells your commits apart by that trailer. A commit with no trailer at all is treated as yours anyway.

5. **Never edit a rule to make your change pass.** If `CLAUDE.md` pins a version, a limit, or a library, that pin is the requirement. If a rule blocks you, stop and write a note under **Questions for senior** in `CODE_REVIEWS.md`. Do not work around it.

6. **Run the tests.** Backend: `cd backend && mvn test` (needs Docker running for Testcontainers). Frontend: `cd frontend && npm run test:e2e`. If you genuinely cannot run them, say exactly what blocked you in the commit message and in the review log. "Tests: environment-blocked" without detail is not enough.

7. **Responding to a review.** Under each checklist item you address, add a line:
   ```
   Codex: <what you did> — <commit hash>
   ```
   Tick the box, and change the entry's status to **Addressed – awaiting senior**. Never delete or rewrite an entry. If you disagree with an item, say so under it with your reasoning. Disagreement is fine. Silence is not.

8. **Seeing what the senior changed.** Each review entry ends with a *Senior changes since last review* list. For the full picture:
   ```bash
   git log --format='%h %s%n    %(trailers:key=Co-Authored-By,valueonly)' development
   ```
   Lines showing `Claude` are the senior's commits. Read those diffs before touching the same files.

9. **Update `PROGRESS_UPDATE.md`** when you finish a feature, exactly as `CLAUDE.md` describes. Rebuild with `docker compose up --build` before claiming something works.

10. **Keep changes small.** One feature or fix per branch. A review of a 300-line diff gets done the same day. A 3,000-line diff waits.
