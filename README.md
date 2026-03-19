# Hustle Economy

Full-stack MVP for onboarding hustlers across KwaZulu-Natal, routing them through facilitator verification, and exposing approved businesses through community hubs + marketplace listings.

## Stack Overview

| Layer      | Tech                                                          |
|------------|---------------------------------------------------------------|
| Backend    | Node.js + Express + Prisma (PostgreSQL)                       |
| Frontend   | React + Vite (TypeScript)                                     |
| Auth       | Simple JWT-based login for hustlers & facilitators            |
| Database   | PostgreSQL (Docker compose included)                          |
| Tooling    | Prisma migrations + seed script, Dockerfile for API container |

## Getting Started

### 1. Clone & install
```bash
# backend
cd backend
cp .env.example .env
npm install
npm run prisma:generate

# frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Launch Postgres + API
```bash
# from repo root
cp backend/.env.example backend/.env  # update secrets as needed
docker compose up --build
```
This exposes:
- Postgres on `localhost:5432`
- API on `http://localhost:4000`
- Health check: `GET /health`

### 3. Prisma migrate & seed
With Docker (or local Postgres) running:
```bash
cd backend
npm run prisma:migrate
npm run seed
```
The seed inserts starter communities (KwaNgwenya, Mhlekazi, Mkuze) pulled from the Hustle Economy datasets.

### 4. Frontend dev server
```bash
cd ../frontend
npm run dev
```
The Vite dev server proxies requests directly to the API base URL specified in `.env` (defaults to `http://localhost:4000`).

## Core Flows Implemented

### Hustler registration
- `/api/hustlers` accepts the full application payload (identity, business story, target customers, operating area, optional coordinates).
- Community can be picked from an existing `communityId` or created on the fly via `communityName`.
- Applications start with `PENDING` status until a facilitator reviews them.

### Facilitator verification
- `/api/hustlers?status=PENDING` lists queued applications (protected by JWT, roles `FACILITATOR` or `ADMIN`).
- `/api/hustlers/:id/decision` toggles `APPROVED/REJECTED`, stores facilitator notes, and promotes approved hustlers into `BusinessProfile` rows for marketplace visibility.

### Marketplace / community hubs
- `/api/communities` lists hubs plus counts.
- `/api/communities/:id/hustlers` returns approved hustlers, including their product catalogues.
- `/api/products` allows hustlers to add products/services against their business profile (role-based guard ensures owners can only edit their own listings).

### Authentication
- `/api/auth/register` handles hustler/facilitator onboarding (name, contact info, password) and returns a JWT.
- `/api/auth/login` issues JWTs for subsequent facilitator approvals or secure product management.

## Frontend Screens
1. **Hero** – programme context / CTA.
2. **Registration Form** – full multi-field form covering story, mission, target customers, and coordinates.
3. **Facilitator Queue** – paste JWT to fetch/approve pending applications.
4. **Community Hubs** – select a community to browse approved hustlers + sample product lists.

All forms call the corresponding API endpoints and surface clear success/error states.

## Roadmap Hooks
- Payment hooks: `Product` model + future `PaymentIntent` table placeholder ready for mobile money/eWallet integration.
- Training / storytelling: extend `BusinessProfile` with media fields or link to a new `Story` table.
- Logistics: add `DeliveryOption` table referencing communities.

## Environment & Secrets
- `backend/.env` → `DATABASE_URL`, `JWT_SECRET`, `PORT`.
- `frontend/.env` → `VITE_API_BASE_URL` for cross-env deployments.
- GitHub token provided by Mesh Audio is required for pushing changes (do **not** commit it).

## Data Sensitivity
The attached facilitator sheets, monthly reports, and individual applications contain personal identifiers. They were used only to shape the schema (vision/mission/target customer fields, community names) and are not stored in the repository. Treat any future imports from those files as confidential PII.

## Next Steps
- Wire facilitator login to UI so tokens are stored securely (e.g., localStorage + logout flow).
- Add media uploads for product photos (S3 or Supabase storage).
- Layer in analytics dashboards for programme managers (insights per community, approval rates, etc.).
- Implement payments + delivery flow (Phase 2) and training/storytelling modules (Phase 4).
