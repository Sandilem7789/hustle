Rebuild only the Docker images whose source files have changed, then restart those containers. Leaves unchanged services running untouched.

## Steps

1. **Detect changed services** — check which source directories have uncommitted or recently changed files:
   ```
   git diff --name-only HEAD
   git diff --name-only --cached
   ```
   - Files under `backend/`  → backend image needs rebuild
   - Files under `frontend/` → frontend image needs rebuild
   - If nothing changed in either, still proceed (user explicitly requested rebuild)

2. **Rebuild and restart only the touched services** — for each affected service run:
   ```
   docker compose up --build -d <service>
   ```
   Where `<service>` is `backend`, `frontend`, or both (space-separated).
   Skip `postgres` — schema migrations run via Flyway on backend startup; no image rebuild needed.

   If git showed no changes in either directory, rebuild both backend and frontend anyway (explicit rebuild request).

3. **Smoke test** — verify services are responding using PowerShell `Invoke-WebRequest`:
   - Frontend: `http://localhost:4173` → expect 200
   - Backend: `http://localhost:8080/api/hustlers` → any non-connection-error response is fine (401/400 means it's up)

4. **Report** — print a short status summary:
   - Which services were rebuilt (and why — changed files or explicit request)
   - Container statuses (`docker compose ps`)
   - Frontend and backend reachability
