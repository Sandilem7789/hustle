# Deployment & Branching Guide — Hustle Economy

## Hosting stack

| Layer | Service | Cost |
|-------|---------|------|
| Frontend (Angular) | Netlify | Free |
| Backend (Spring Boot) | Railway | ~$5/month |
| Database (PostgreSQL) | Railway (bundled) | Included above |

Railway runs the existing `backend/Dockerfile` as-is and hosts PostgreSQL alongside it — no cold starts, no sleep. Netlify proxies `/api/` calls to Railway so the Angular app never needs to know the backend URL directly.

---

## Git branching strategy

```
main      ← production — what your phone and users hit
develop   ← your working branch — all new features go here first
```

### Rules

- **Never commit directly to `main`**
- All feature work goes on `develop` (or short-lived `feature/name` branches branched from `develop`)
- When a feature is tested and ready, open a PR: `develop` → `main`
- Railway and Netlify auto-deploy the moment a push lands on `main`
- Hotfixes (urgent bugs in production): branch from `main` as `hotfix/name`, fix, PR to **both** `main` AND `develop`

```
main ◄──── PR: develop → main (release)
            ◄── PR: hotfix/login-crash → main (urgent)
              │
develop ◄── feature/add-cart
        ◄── feature/driver-map
        ◄── hotfix/login-crash (also merged here after main)
```

### Initial setup (run once)

```bash
git checkout -b develop
git push -u origin develop
```

---

## Step-by-step deployment

### Step 1 — Fix database config for production

In `backend/src/main/resources/application.properties`, ensure DDL auto is set to `update` not `create` or `create-drop` — otherwise Railway wipes your data on every deploy:

```properties
spring.jpa.hibernate.ddl-auto=update
```

### Step 2 — Add CORS origins for production

Open `backend/src/main/java/com/hustle/economy/config/WebConfig.java` and add your production URLs once you have them (fill in after Steps 4 and 5):

```java
"https://your-app.netlify.app",
"https://your-custom-domain.co.za"  // if you add a custom domain later
```

### Step 3 — Create `netlify.toml` at the repo root

This tells Netlify how to build and proxy `/api/` calls to Railway:

```toml
[build]
  base    = "frontend"
  command = "npm run build -- --configuration production"
  publish = "dist/frontend/browser"

[[redirects]]
  from   = "/api/*"
  to     = "https://YOUR-RAILWAY-BACKEND-URL.railway.app/api/:splat"
  status = 200
  force  = true

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

> Replace `YOUR-RAILWAY-BACKEND-URL` with the URL from Step 4.

### Step 4 — Deploy backend + database on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select `hustle` → branch: `main`
3. Set **Root Directory** to `backend` (Railway will use `backend/Dockerfile`)
4. Click **Add Plugin → PostgreSQL** — Railway creates a database and provides a `DATABASE_URL`
5. In your backend service **Variables** tab, set:
   ```
   DATABASE_URL=jdbc:postgresql://<host>:<port>/<db>   ← convert from the postgresql:// URL Railway gives you
   POSTGRES_USER=<from Railway>
   POSTGRES_PASSWORD=<from Railway>
   PORT=8080
   ```
6. Railway builds and deploys — copy the generated URL (e.g. `hustle-backend.up.railway.app`)
7. Paste that URL into `netlify.toml` (Step 3) and also into `WebConfig.java` (Step 2)

### Step 5 — Deploy frontend on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Connect GitHub → select `hustle` → branch: **`main`**
3. Netlify reads `netlify.toml` automatically — no manual build config needed
4. Hit **Deploy** — you'll get a URL like `hustle-economy.netlify.app`
5. Copy that URL and add it to `WebConfig.java` CORS origins (Step 2), then push to `main`

### Step 6 — Set up Netlify deploy previews (optional but recommended)

Enable preview deploys so every PR from `develop` → `main` gets its own URL you can test on your phone before merging:

**Netlify → Site settings → Build & deploy → Deploy previews → Enable**

### Step 7 — Migrate existing data

If you have data in your local PostgreSQL you want to keep:

```bash
# Dump local DB
pg_dump -U postgres hustle > hustle_backup.sql

# Push to Railway (get connection string from Railway dashboard)
psql "postgresql://user:pass@host:port/db" < hustle_backup.sql
```

---

## Ongoing development workflow

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature

# Work and commit as normal...
git push origin feature/my-new-feature

# Open PR: feature/my-new-feature → develop
# Test on develop (optionally point Netlify to develop branch for a staging site)

# When ready to go live: open PR: develop → main
# Netlify + Railway auto-deploy within ~2 minutes of merge
```

### Fixing a live bug (hotfix)

```bash
git checkout main
git pull origin main
git checkout -b hotfix/describe-the-bug
# fix the bug, commit
git push origin hotfix/describe-the-bug
# Open PR to main — merge to deploy immediately
# Then also merge into develop so the fix isn't lost
git checkout develop && git merge hotfix/describe-the-bug && git push
```

---

## Environment summary

| Environment | Branch | URL | Auto-deploys |
|-------------|--------|-----|--------------|
| Production | `main` | `your-app.netlify.app` | On push to `main` |
| Staging (optional) | `develop` | Netlify preview URL | On push to `develop` |
| Local dev | — | `localhost:4200` (frontend) `localhost:8080` (backend) | Manual |
