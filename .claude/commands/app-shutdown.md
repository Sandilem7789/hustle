Gracefully stop all running Hustle services via Docker Compose.

## Steps

1. **Check running containers** — show current state before stopping:
   ```
   docker compose ps
   ```
   If no containers are running, report that and stop — nothing to do.

2. **Docker Compose down** — stop and remove all containers:
   ```
   docker compose down
   ```

3. **Confirm** — verify all containers are stopped:
   ```
   docker compose ps
   ```

4. **Report** — print a short status summary confirming all services are down.
