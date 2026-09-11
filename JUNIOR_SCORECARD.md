# Junior Scorecard — Sandile.Codex

Per-area scores from each review in `CODE_REVIEWS.md`, produced by the `junior-reviewer` agent and confirmed by the senior. Scores are 1–5 (3 = competent). Weighted average doubles Correctness and Security.

Purpose: after several reviews, the per-area averages show where the junior should be given more work and where they need supervision.

## Running averages

| Area | Reviews | Weighted avg |
|------|---------|--------------|
| Frontend | 0 | – |
| Backend | 0 | – |
| Infrastructure | 1 | 2.6 |
| Testing | 0 | – |
| Docs | 1 | 2.1 |

_(Senior recomputes this table after adding rows below.)_

## Rows

| Review | Date | Area | Commits | Correctness | Conventions | Testing | Scope | Security | Weighted avg | Justification |
|--------|------|------|---------|-------------|-------------|---------|-------|----------|--------------|---------------|
| R1 | 2026-09-11 | Infrastructure | 8fb0787 | 3 | 1 | 1 | 2 | 4 | 2.6 | Compile on Java 25 is verified and the driver CVE pin is right, but it edited the Java 21 pin instead of following it, bundled a Boot/Hibernate jump, never built the Docker image, and shipped with all five tests erroring on a stopped Docker daemon. |
| R1 | 2026-09-11 | Docs | 8fb0787 | 2 | 1 | 2 | 2 | 3 | 2.1 | The only doc change rewrites a pinned rule to match the code and breaks the Markdown hard line break after it, so the rendered result was not checked. |

## Placement notes

- **R1:** Strongest in infrastructure mechanics (chosen versions resolve and compile, honest test count). Weakest in process discipline (rule editing, commit format, branch hygiene, accepting "tests could not run" on a framework upgrade). Next task to test that read: land only the PostgreSQL driver pin as one `fix:` commit on a `feature/` branch off `development`, Docker running, `mvn test` green, Codex trailer present.
