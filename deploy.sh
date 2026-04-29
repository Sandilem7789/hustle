#!/usr/bin/env bash
# Hustle Backend — production deployment script
# Run as: bash deploy.sh
set -euo pipefail

REPO_URL="https://github.com/Sandilem7789/hustle.git"
INSTALL_DIR="$HOME/hustle-backend"
COMPOSE_FILE="docker-compose.prod.yml"
TRAEFIK_NETWORK="root_default"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
abort()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo ""
echo "======================================"
echo "  Hustle Backend — Production Deploy  "
echo "======================================"
echo ""

# ── 1. Safety: refuse to run as root ──────────────────────────────────────────
if [ "$EUID" -eq 0 ]; then
    abort "Do not run this script as root. Run as user 'sandile'."
fi

# ── 2. Docker check ───────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    abort "Docker is not installed. Install it first:\n  curl -fsSL https://get.docker.com | sh\n  sudo usermod -aG docker \$USER\nThen log out, log back in, and re-run this script."
fi

if ! docker info &>/dev/null; then
    warn "Docker daemon not running — starting it..."
    sudo systemctl start docker
fi

info "Docker OK."

# ── 3. Verify Traefik network exists ──────────────────────────────────────────
if ! docker network inspect "$TRAEFIK_NETWORK" &>/dev/null; then
    abort "Traefik network '$TRAEFIK_NETWORK' not found. Is Traefik running?"
fi
info "Traefik network '$TRAEFIK_NETWORK' found."

# ── 4. Stop old hustle stack inside OpenClaw workspace (if running) ───────────
OLD_COMPOSE="/home/sandile/openclaw/workspace/hustle/docker-compose.yml"
if [ -f "$OLD_COMPOSE" ]; then
    warn "Found old hustle stack in OpenClaw workspace — stopping it..."
    docker compose -f "$OLD_COMPOSE" down --remove-orphans 2>/dev/null || true
    info "Old stack stopped."
fi

# ── 5. Clone or update the repo ───────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
    info "Repo already exists — pulling latest..."
    git -C "$INSTALL_DIR" pull origin main
else
    info "Cloning repo to $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── 6. Create .env if not present ─────────────────────────────────────────────
if [ -f ".env" ]; then
    warn ".env already exists — skipping credential prompt. Delete it and re-run to change credentials."
else
    echo ""
    info "Creating .env — enter your production credentials."
    info "(Input is hidden where marked *)"
    echo ""

    read -rp  "  PostgreSQL username  [postgres]: " PG_USER
    PG_USER=${PG_USER:-postgres}

    read -rsp "  PostgreSQL password* : " PG_PASS; echo ""
    [ -z "$PG_PASS" ] && abort "PostgreSQL password cannot be empty."

    read -rp  "  Database name        [hustle]: " PG_DB
    PG_DB=${PG_DB:-hustle}

    read -rp  "  Staff phone number   : " STAFF_PHONE
    [ -z "$STAFF_PHONE" ] && abort "Staff phone cannot be empty."

    read -rsp "  Staff password*      : " STAFF_PASS; echo ""
    [ -z "$STAFF_PASS" ] && abort "Staff password cannot be empty."

    cat > .env <<EOF
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=${PG_DB}
STAFF_PHONE=${STAFF_PHONE}
STAFF_PASSWORD=${STAFF_PASS}
EOF
    chmod 600 .env
    info ".env created with permissions 600 (owner-only)."
fi

# ── 7. Tear down any previous hustle-backend stack ────────────────────────────
info "Stopping any previous hustle-backend stack..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

# ── 8. Build and start ────────────────────────────────────────────────────────
info "Building images and starting services (first run takes a few minutes)..."
docker compose -f "$COMPOSE_FILE" up -d --build

# ── 9. Health check — query the backend container directly ────────────────────
info "Waiting for backend to be ready..."
READY=0
for i in $(seq 1 40); do
    if docker compose -f "$COMPOSE_FILE" exec -T backend \
        curl -sf http://localhost:8080/api/hustlers >/dev/null 2>&1; then
        READY=1
        break
    fi
    printf "."
    sleep 3
done
echo ""

if [ "$READY" -eq 1 ]; then
    echo ""
    echo -e "${GREEN}======================================"
    echo -e "  Deployment successful!"
    echo -e "======================================${NC}"
    echo ""
    info "API (via Traefik) : https://srv1144757.hstgr.cloud/api/"
    info "Frontend          : https://hustleconomy.netlify.app/"
    echo ""
    info "Useful commands:"
    echo "  docker compose -f $COMPOSE_FILE logs -f backend   # live backend logs"
    echo "  docker compose -f $COMPOSE_FILE ps                 # container status"
    echo "  docker compose -f $COMPOSE_FILE down               # stop everything"
else
    echo ""
    abort "Backend did not respond after 120 s. Check logs:\n  docker compose -f $COMPOSE_FILE logs backend"
fi
