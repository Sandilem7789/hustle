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
- [ ] **Blocking** — The commit message says `Tests: 0/5 environment-blocked`. Nothing merges with unverified tests. Run `cd backend && mvn test` with Docker up. If the Docker socket is what blocks you, state that exactly.
- [ ] **Should fix** — The PostgreSQL driver pin to `42.7.12` for CVE-2026-54291 is correct and low-risk. Land it now as a separate `fix: pin postgresql driver 42.7.12 for CVE-2026-54291` commit on `development`. Do not hold it behind the Java question.
- [ ] **Should fix** — Commit message does not follow the `type: short description` convention and is missing the Codex trailer (see `AGENTS.md` rule 4).
- [ ] **Nit** — `appmod/java-upgrade-*` branch names are tool-generated. A stale `appmod/java-upgrade-20260328133842` branch also exists locally and on origin with nothing on it. Delete both once the work above is split into properly named branches.

### Senior changes since last review
- Added `AGENTS.md`, `CODE_REVIEWS.md`, and a *Team workflow* section in `CLAUDE.md`. No application code changed.
