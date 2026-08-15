#!/usr/bin/env bash

# ==============================================================================
# CareSignal - Production Database Cleaner
# Wipes all seed and demo records while preserving the root admin account
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$ROOT_DIR"

echo "🧹 Wiping production demo data (preserving protected root administrator)..."
docker compose -f infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/clean.js
