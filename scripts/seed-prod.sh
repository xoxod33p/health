#!/usr/bin/env bash

# ==============================================================================
# CareSignal - Production Database Seed & Reset Utility
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$ROOT_DIR"

ACTION="${1:-seed}"

case "$ACTION" in
  seed)
    echo "🌱 Seeding demo healthcare data in production..."
    docker compose -f infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/seed.js
    ;;
  clean|wipe)
    echo "🧹 Wiping seed data (preserving root admin)..."
    docker compose -f infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/clean.js
    ;;
  reset)
    echo "🔄 Resetting database and re-seeding fresh data..."
    docker compose -f infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/clean.js
    docker compose -f infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/bootstrap-admin.js
    docker compose -f infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/seed.js
    ;;
  *)
    echo "Usage: ./scripts/seed-prod.sh [seed | clean | reset]"
    exit 1
    ;;
esac
