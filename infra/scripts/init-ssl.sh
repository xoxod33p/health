#!/usr/bin/env bash
# ==============================================================================
# SSL Certificate Initialization Script for Healthcare Platform
# Usage: sudo bash init-ssl.sh test.xoxod33p.tech admin@xoxod33p.tech
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-test.xoxod33p.tech}"
EMAIL="${2:-admin@$DOMAIN}"

echo "==> Initializing SSL certificate for domain: $DOMAIN..."

mkdir -p "/etc/letsencrypt/live/$DOMAIN"
mkdir -p "/var/www/certbot"

# 1. Generate temporary self-signed certificate if no cert exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "==> Creating temporary self-signed certificate for Nginx startup..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
      -out "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
      -subj "/CN=localhost"
fi

# 2. Reload Nginx so it picks up the certificate
echo "==> Reloading Nginx..."
docker compose -f /opt/health/infra/docker-compose.yml exec nginx nginx -s reload || docker compose -f ~/health/infra/docker-compose.yml exec nginx nginx -s reload || true

# 3. Request real Let's Encrypt certificate
echo "==> Requesting real Let's Encrypt certificate from Certbot..."
certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --force-renewal

# 4. Reload Nginx with real SSL certificate
echo "==> Reloading Nginx with production SSL certificate..."
docker compose -f /opt/health/infra/docker-compose.yml exec nginx nginx -s reload || docker compose -f ~/health/infra/docker-compose.yml exec nginx nginx -s reload

echo "==> SSL Certificate successfully configured for https://$DOMAIN !"
