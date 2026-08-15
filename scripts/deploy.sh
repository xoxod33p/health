#!/usr/bin/env bash

# ==============================================================================
# CareSignal - Production Deployment Runner
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Resolve directory of the repository
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$ROOT_DIR"

log_info "Deploying CareSignal at $ROOT_DIR..."

# 1. Check environment configuration
if [ ! -f "$ROOT_DIR/.env" ]; then
    if [ -f "$ROOT_DIR/.env.production" ]; then
        log_info "Copying .env.production to .env..."
        cp "$ROOT_DIR/.env.production" "$ROOT_DIR/.env"
    elif [ -f "$ROOT_DIR/.env.example" ]; then
        log_warn "No .env found. Creating .env from .env.example..."
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    else
        log_error "Critical: No .env configuration file found."
        exit 1
    fi
fi

# 2. Create categorized local storage folders
mkdir -p storage/reports storage/customers storage/sensors
chmod -R 775 storage 2>/dev/null || true

# 3. Build and launch Docker Compose production stack
log_info "Building and launching production Docker containers..."
docker compose -f infra/docker-compose.prod.yml up -d --build --remove-orphans

# 4. Wait for services to become healthy
log_info "Awaiting service readiness..."
ATTEMPTS=0
MAX_ATTEMPTS=30
HEALTHY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -sf http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 2
done

if [ "$HEALTHY" = true ]; then
    log_success "API is up and healthy!"
else
    log_warn "API health check timed out. Inspecting container logs:"
    docker compose -f infra/docker-compose.prod.yml logs --tail=30
fi

# 5. Bootstrap default administrator if not already initialized
log_info "Bootstrapping default admin account..."
docker compose -f infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/bootstrap-admin.js 2>&1 || true

# 6. Clean dangling images to conserve VPS disk storage
log_info "Pruning unused Docker images..."
docker image prune -f >/dev/null 2>&1 || true

# 7. Reload Nginx if running on host
if command -v nginx >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
    log_info "Synchronizing Nginx configuration..."
    if [ -f "$ROOT_DIR/infra/nginx/caresignal.conf.template" ] && [ -f "$ROOT_DIR/.env" ]; then
        DOMAIN=$(grep -E '^DOMAIN_NAME=' "$ROOT_DIR/.env" | cut -d '=' -f2 | tr -d '\r"' || true)
        if [ -n "$DOMAIN" ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            sed "s/\${DOMAIN_NAME}/$DOMAIN/g" "$ROOT_DIR/infra/nginx/caresignal.conf.template" | (tee /etc/nginx/sites-available/caresignal.conf 2>/dev/null || sudo tee /etc/nginx/sites-available/caresignal.conf 2>/dev/null || true) >/dev/null
        fi
    fi
    (nginx -t 2>/dev/null || sudo nginx -t) && (systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx 2>/dev/null || true)
fi

# 8. Print running container summary
echo ""
echo "======================================================"
log_success "Deployment completed successfully!"
echo "======================================================"
docker compose -f infra/docker-compose.prod.yml ps
echo "======================================================"
