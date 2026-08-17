#!/usr/bin/env bash

# ==============================================================================
# CareSignal - Automated Ubuntu VPS Setup & SSL Provisioning Script
# Supported OS: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 1. Root / Sudo Check
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo: sudo bash scripts/setup-vps.sh"
    exit 1
fi

echo "======================================================"
echo "    🏥 CareSignal Ubuntu VPS Automated Provisioning    "
echo "======================================================"

# 2. Input Parameters (Domain, Email, Target Directory)
DOMAIN_NAME="${1:-${DOMAIN_NAME:-}}"
SSL_EMAIL="${2:-${SSL_EMAIL:-}}"
APP_DIR="${3:-${APP_DIR:-/opt/health}}"

if [ -z "$DOMAIN_NAME" ]; then
    read -rp "Enter your Domain Name (e.g., caresignal.example.com): " DOMAIN_NAME
fi

if [ -z "$SSL_EMAIL" ]; then
    read -rp "Enter your Admin Email for Let's Encrypt SSL: " SSL_EMAIL
fi

if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ]; then
    log_error "Domain name and SSL email cannot be empty."
    exit 1
fi

log_info "Target Domain: $DOMAIN_NAME"
log_info "SSL Admin Email: $SSL_EMAIL"
log_info "Application Directory: $APP_DIR"

# 3. System Updates & Prerequisites
log_info "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    jq \
    sed \
    openssl \
    nginx \
    certbot \
    python3-certbot-nginx

# 4. Install Docker Engine & Docker Compose Plugin (Official Docker Repo)
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker Engine & Docker Compose..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    log_success "Docker installed successfully."
else
    log_info "Docker is already installed."
fi

# 5. Configure Firewall (UFW)
log_info "Configuring UFW firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
log_success "Firewall configured (SSH, HTTP, HTTPS allowed)."

# 6. Prepare Directories
log_info "Setting up application and certbot directories..."
mkdir -p "$APP_DIR"
mkdir -p /var/www/certbot
chmod -R 755 /var/www/certbot
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# 7. Initial Nginx HTTP Configuration for ACME Challenge
log_info "Configuring initial HTTP Nginx server for SSL challenge..."
cat <<EOF > /etc/nginx/sites-available/caresignal.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    location / {
        return 200 "CareSignal VPS initialization in progress. SSL verification active.";
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/caresignal.conf /etc/nginx/sites-enabled/caresignal.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

# 8. Obtain SSL Certificate via Certbot
log_info "Requesting Let's Encrypt SSL certificate for ${DOMAIN_NAME}..."
if [ ! -d "/etc/letsencrypt/live/${DOMAIN_NAME}" ]; then
    certbot certonly --webroot -w /var/www/certbot \
        -d "$DOMAIN_NAME" \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --non-interactive
    log_success "SSL certificate successfully obtained."
else
    log_info "SSL certificate already exists for ${DOMAIN_NAME}."
fi

# 9. Apply Production Nginx SSL Configuration
log_info "Applying production SSL Nginx configuration..."
cat <<EOF > /etc/nginx/sites-available/caresignal.conf
# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server - CareSignal Reverse Proxy
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN_NAME};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    client_max_body_size 64M;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    location ~* ^/(socket\.io|realtime)/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;

        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

nginx -t
systemctl reload nginx
log_success "Production Nginx configuration loaded."

# 10. Generate Initial Production .env File If Missing
if [ ! -f "$APP_DIR/.env" ]; then
    log_info "Generating production .env template in $APP_DIR..."
    RANDOM_JWT=$(openssl rand -hex 32)
    RANDOM_MONGO_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 20)
    RANDOM_REDIS_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 20)

    cat <<EOF > "$APP_DIR/.env"
# CareSignal Production Environment
NODE_ENV=production
PORT=3001
DOMAIN_NAME=${DOMAIN_NAME}
WEB_ORIGIN=https://${DOMAIN_NAME}
NEXT_PUBLIC_API_URL=https://${DOMAIN_NAME}/api/v1
JWT_SECRET=${RANDOM_JWT}

# MongoDB Database Configuration
MONGO_ROOT_USERNAME=healthcare
MONGO_ROOT_PASSWORD=${RANDOM_MONGO_PASS}
MONGO_DATABASE=healthcare
MONGODB_URI=mongodb://healthcare:${RANDOM_MONGO_PASS}@mongodb:27017/healthcare?authSource=admin

# Redis Cache Configuration
REDIS_PASSWORD=${RANDOM_REDIS_PASS}
REDIS_URL=redis://:${RANDOM_REDIS_PASS}@redis:6379

# Local Storage Directory
STORAGE_PATH=/app/storage

# Default System Administrator Credentials
DEFAULT_ADMIN_EMAIL=admin@${DOMAIN_NAME}
DEFAULT_ADMIN_PASSWORD=CareSignalAdmin2026!
DEFAULT_ADMIN_ROLE=SYSTEM_ADMIN
DEFAULT_ADMIN_COMPANY_ID=caresignal-production
EOF
    chmod 600 "$APP_DIR/.env"
    log_success "Generated secure production .env in $APP_DIR/.env"
    echo -e "${YELLOW}Initial Admin Credentials:${NC}"
    echo -e "  Email:    admin@${DOMAIN_NAME}"
    echo -e "  Password: CareSignalAdmin2026!"
else
    log_info "Existing .env found at $APP_DIR/.env, preserving configuration."
fi

# 11. Verify Certbot Auto-Renewal
log_info "Verifying Certbot automated renewal timer..."
systemctl enable certbot.timer
systemctl start certbot.timer
certbot renew --dry-run
log_success "Certbot auto-renewal timer verified."

echo ""
echo "======================================================"
echo -e "${GREEN}🎉 Ubuntu VPS Provisioning Completed Successfully!${NC}"
echo "======================================================"
echo -e "Domain:        https://${DOMAIN_NAME}"
echo -e "App Directory: ${APP_DIR}"
echo ""
echo "Next Step: Configure GitHub Secrets in your repository to enable CI/CD:"
echo "  VPS_HOST:      $(curl -s ifconfig.me || echo 'YOUR_VPS_IP')"
echo "  VPS_USERNAME:  $(whoami || echo 'root')"
echo "  VPS_PASSWORD:  (Your VPS SSH Password)"
echo "  VPS_PORT:      22"
echo "======================================================"
