# Hustle Economy (Spring Boot + Angular)

Full-stack MVP for onboarding hustlers across KwaZulu-Natal, routing applications through facilitator verification, and showcasing approved hustlers inside community hubs.

## Stack Overview

| Layer    | Tech                                                   |
|----------|--------------------------------------------------------|
| Backend  | Java 21 · Spring Boot 3 · Spring Data JPA · PostgreSQL |
| Frontend | Angular 18 · Tailwind CSS                              |
| Infra    | Docker Compose (Postgres + API + Angular static site)  |

## Local Development

### Prerequisites
- Docker + Docker Compose
- Node 20+ (only if you want to run Angular outside Docker)
- Java 21 (only if you want to run Spring Boot outside Docker)

### 1. Environment configuration
`backend/src/main/resources/application.properties` already reads the DB connection details from environment variables. When running locally without Docker, export:

```bash
export DATABASE_URL=jdbc:postgresql://localhost:5432/hustle
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export PORT=8080
```

### 2. Run everything with Docker Compose
```bash
# from repo root
docker compose up --build
```
Services exposed:
- API → http://localhost:8080
- Angular UI → http://localhost:4173
- Postgres → localhost:5432 (user/password `postgres`)

### 3. Running services manually (optional)
**Backend**
```bash
cd backend
./mvnw spring-boot:run  # or `mvn spring-boot:run` if Maven is installed
```

**Frontend**
```bash
cd frontend
npm install
npm start  # Angular dev server on http://localhost:4200
```

## API Highlights
- `POST /api/hustlers` – submit a hustler application (personal + business details + optional coordinates).
- `GET /api/hustlers?status=PENDING` – list applications by status; accepts optional `communityId` filter.
- `PATCH /api/hustlers/{id}/decision` – facilitator approves or rejects and promotes approved hustlers to business profiles.
- `GET /api/communities` – list available communities.
- `GET /api/communities/{id}/hustlers` – list approved hustlers in a community.
- `POST /api/products` / `GET /api/products` – manage marketplace listings (scaffolded for Phase 2 payments/logistics).

## Frontend Screens
1. **Hero** – Context, CTA, and summary of the Hustle Economy programme.
2. **Registration Form** – Large reactive form covering business story, mission, target customers, and operating area.
3. **Facilitator Queue** – Inline status filter + approve/reject actions hitting the Spring API.
4. **Community Hubs** – Horizontal selector of communities showing the approved hustlers per hub.

## Docker Images
- `backend/Dockerfile` – multi-stage build (Maven builder → Temurin JRE runtime).
- `frontend/Dockerfile` – Node builder → Nginx static container.

## Testing / Next Steps
- Finish UI polish + validation states across Angular components.
- Add authentication (JWT) once facilitator accounts are required.
- Hook up products/services catalogues to actual media uploads + payments (Phase 2).
- Extend analytics dashboards for facilitators/programme managers.

## Deployment Notes
1. `git pull` on the VPS.
2. `docker compose build --no-cache && docker compose up -d`.
3. API available on port 8080, Angular site proxied on 4173 (adjust DNS/reverse proxy as needed).

Treat the facilitator spreadsheets and application PDFs as sensitive data—none of the PII was checked into the repo, but keep future imports confidential.
