#!/usr/bin/env bash

# ==============================================================================
# CareSignal - Certbot SSL Renewal & Nginx Reload Helper
# ==============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
    echo "[ERROR] Please run as root or with sudo: sudo bash scripts/renew-ssl.sh"
    exit 1
fi

echo "[INFO] Running Certbot SSL certificate renewal check..."

# Attempt renewal using webroot
certbot renew --webroot -w /var/www/certbot --quiet --no-self-upgrade

echo "[INFO] Testing Nginx configuration..."
nginx -t

echo "[INFO] Reloading Nginx service..."
systemctl reload nginx

echo "[SUCCESS] SSL certificates checked and Nginx reloaded."
