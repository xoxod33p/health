#!/usr/bin/env bash
# ==============================================================================
# CareSignal Platform - Zero-Downtime Automated SSL Installer
# Run on VPS: sudo bash infra/scripts/setup-ssl.sh test.xoxod33p.tech
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-test.xoxod33p.tech}"
EMAIL="${2:-admin@$DOMAIN}"

echo "============================================================"
echo " Starting SSL Setup for: https://$DOMAIN"
echo "============================================================"

# Ensure directories exist on host
mkdir -p "/etc/letsencrypt/live/$DOMAIN"
mkdir -p "/var/www/certbot"

# 1. Create temporary self-signed dummy cert if no cert exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "[1/4] Generating temporary SSL certificate for Nginx startup..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
      -out "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
      -subj "/CN=$DOMAIN"
fi

# 2. Ensure Nginx container is running
echo "[2/4] Starting Nginx container..."
cd ~/health
docker compose -f infra/docker-compose.prod.yml up -d nginx

# 3. Request official Let's Encrypt certificate from Certbot
echo "[3/4] Requesting official Let's Encrypt SSL certificate..."
sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --force-renewal

# 4. Reload Nginx with production SSL certificate
echo "[4/4] Reloading Nginx with production SSL certificate..."
docker compose -f infra/docker-compose.prod.yml exec nginx nginx -s reload

echo "============================================================"
echo " SUCCESS! SSL setup complete: https://$DOMAIN"
echo "============================================================"
