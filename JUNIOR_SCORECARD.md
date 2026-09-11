# Junior Scorecard — Sandile.Codex

Per-area scores from each review in `CODE_REVIEWS.md`, produced by the `junior-reviewer` agent and confirmed by the senior. Scores are 1–5 (3 = competent). Weighted average doubles Correctness and Security.

Purpose: after several reviews, the per-area averages show where the junior should be given more work and where they need supervision.

## Running averages

| Area | Reviews | Weighted avg |
|------|---------|--------------|
| Frontend | 0 | – |
| Backend | 0 | – |
| Infrastructure | 1 | 2.1 |
| Testing | 0 | – |
| Docs | 0 | – |

_(Senior recomputes this table after adding rows below.)_

## Rows

| Review | Date | Area | Commits | Correctness | Conventions | Testing | Scope | Security | Weighted avg | Justification |
|--------|------|------|---------|-------------|-------------|---------|-------|----------|--------------|---------------|
| R1 | 2026-09-11 | Infrastructure | 8fb0787 | 3 | 1 | 1 | 2 | 4 | 2.1 | Versions resolve and the driver CVE pin is right, but it edited the Java 21 pin instead of following it, bundled a Boot major-minor jump, and shipped with tests unrun. |
