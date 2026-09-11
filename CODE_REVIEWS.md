# Code Reviews — Hustle WebApp

Review log between **Sandile.Claude** (senior) and **Sandile.Codex** (junior). See `AGENTS.md` for the workflow.

- Newest entry first.
- Statuses: **Open** → **Addressed – awaiting senior** → **Closed**, or **Won't fix** (with reason).
- Only the senior sets **Closed**. The junior never deletes or rewrites an entry.

## Questions for senior

_(Junior: add questions here when a rule blocks you. Senior answers inline and moves resolved ones into the relevant review entry.)_

---

## Entry template

```
## R<n> — <date> — <branch> — <short title>
**Scope:** <commit range or hashes>
**Status:** Open
**Verdict:** <Merge / Merge after fixes / Do not merge>

### Findings
- [ ] **Blocking** — <finding> (`path/file.ext:line`)
- [ ] **Should fix** — <finding>
- [ ] **Nit** — <finding>

### Senior changes since last review
- <commit hash> — <what and why>
```

---

## R1 — 2026-09-11 — appmod/java-upgrade-20260910194812 — Java 25 / Spring Boot 3.5 upgrade
**Scope:** `8fb0787` (Step 3: Upgrade Java runtime to 25)
**Status:** Open
**Verdict:** Do not merge as-is. Split it up.

### Findings
- [ ] **Blocking** — Java is pinned to **21** in `CLAUDE.md` ("do not suggest upgrading"). The commit changed the pin text to 25 instead of following it. Revert `java.version` in `backend/pom.xml`, both `FROM` lines in `backend/Dockerfile`, and the `CLAUDE.md` line. If you believe the pin should change, raise it under *Questions for senior* with a reason. Editing the rule is never the fix.
- [ ] **Blocking** — Spring Boot `3.2.4 → 3.5.16` is bundled into the same commit as the Java bump. It is a good upgrade on its own (3.2 is out of open-source support), but it moves Hibernate from 6.4 to 6.6 while production runs `spring.jpa.hibernate.ddl-auto=update` against live data. Do it as its own `chore:` commit on `development`. Boot it locally against a copy of the production schema, watch the startup log for unexpected DDL, and run the full backend test suite.
- [ ] **Blocking** — The commit message says `Tests: 0/5 environment-blocked`. `backend/target/surefire-reports/*.txt` show all five integration classes failing in `beforeAll` with `Could not find a valid Docker environment`: Docker Desktop was not running. That is the cause the message should have stated. Nothing merges with unverified tests. Start Docker, run `cd backend && mvn test`, and put the real result in the commit message.
- [ ] **Should fix** — `backend/Dockerfile:2` went from the exact tag `maven:3.9.6-eclipse-temurin-21` to the floating `maven:3.9-eclipse-temurin-25`, and with the daemon down the image was never built. A push to `main` runs `up --build` on the VPS, so an unbuildable Dockerfile is a production outage. Keep exact tags and run `docker compose build backend` before committing.
- [ ] **Should fix** — The only JDK on this machine is 21 and there is no `mvnw` or Maven toolchain, so after this commit the documented `cd backend && mvn test` fails at compile. Whatever produced the Java 25 class files was the upgrade tool's own JDK. Any toolchain change must leave the documented dev commands working.
- [ ] **Should fix** — The PostgreSQL driver pin to `42.7.12` for CVE-2026-54291 is correct and low-risk (Boot 3.5.16 manages 42.7.11). Land it now as a separate `fix: pin postgresql driver 42.7.12 for CVE-2026-54291` commit on `development`, citing the advisory URL. Do not hold it behind the Java question.
- [ ] **Should fix** — Commit message does not follow the `type: short description` convention, is missing the Codex trailer (see `AGENTS.md` rule 4), and "Step 3" refers to a tool plan that is not in the repo.
- [ ] **Nit** — `backend/pom.xml` sets the `postgresql.version` property and also adds an explicit `<version>` element on the dependency. The property alone overrides Boot's managed version. Drop the element. The Lombok override to 1.18.48 (Boot 3.5.16 manages 1.18.46) has no stated reason; justify it or drop it.
- [ ] **Nit** — `CLAUDE.md` lost the two trailing spaces after the Java pin line, so the "Node version" line now renders as part of the same paragraph. Restore them.
- [ ] **Nit** — `appmod/java-upgrade-*` branch names are tool-generated and the branch forks from a stale base. A second `appmod/java-upgrade-20260328133842` branch exists locally and on origin with nothing on it. Rebase the surviving pieces onto `development` under `feature/` names and delete both `appmod/*` branches.

### Senior changes since last review
- `3784465` — Added `AGENTS.md`, `CODE_REVIEWS.md`, and a *Team workflow* section in `CLAUDE.md`.
- `f6ed7ac` — Added the `junior-reviewer` subagent and `JUNIOR_SCORECARD.md`. No application code changed.
