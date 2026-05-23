Pull the latest code from GitHub on the current branch, rebuild Docker images, and start all Hustle services.

## Steps

1. **Git pull** — get the current branch name, then fetch and merge latest changes:
   ```
   git branch --show-current
   git pull origin <current-branch>
   ```
   Report what changed (already up to date, or list of updated files).

2. **Docker Compose up** — rebuild images and start all containers in detached mode:
   ```
   docker compose up --build -d
   ```
   Wait for the command to complete. This starts:
   - `hustle-postgres-1` — PostgreSQL on port 5432
   - `hustle-backend-1`  — Spring Boot API on port 8080
   - `hustle-frontend-1` — Angular/Nginx on port 4173

3. **Smoke test** — verify services are responding using PowerShell `Invoke-WebRequest`:
   - Frontend: `http://localhost:4173` → expect 200
   - Backend: `http://localhost:8080/api/hustlers` → any response means it's up (401/400 is fine)

4. **Report** — print a short status summary:
   - Git pull result
   - Container statuses (`docker compose ps`)
   - Frontend and backend reachability
