#!/bin/sh
set -e

# Domain name from environment variable
DOMAIN="${DOMAIN_NAME:-localhost}"

if [ "$DOMAIN" = "_" ] || [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
fi

CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "==> Creating temporary self-signed SSL certificate for $DOMAIN..."
    mkdir -p "$CERT_DIR"
    apk add --no-cache openssl >/dev/null 2>&1 || true
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN" >/dev/null 2>&1
    echo "==> Self-signed SSL certificate created at $CERT_DIR"
fi
