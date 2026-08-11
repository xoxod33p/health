#!/usr/bin/env bash

# ==============================================================================
# Healthcare Platform VPS Initial Setup Script for Ubuntu 22.04 / 24.04 LTS
# Run as root or with sudo: bash setup-vps.sh
# ==============================================================================

set -euo pipefail

echo "==> Starting VPS provisioning for Healthcare Platform..."

# 1. Update system packages
echo "==> Updating package repository..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl ca-certificates gnupg lsb-release ufw git certbot

# 2. Install Docker Engine and Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "==> Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable and start Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "==> Docker installed successfully."
else
    echo "==> Docker is already installed."
fi

# Add current user to docker group if non-root
if [ "$USER" != "root" ]; then
    sudo usermod -aG docker "$USER"
    echo "==> Added $USER to docker group. Note: re-login required for group changes to take effect."
fi

# 3. Configure Docker Daemon Log Rotation (Prevents disk exhaustion)
echo "==> Configuring Docker log rotation..."
sudo mkdir -p /etc/docker
cat <<EOF | sudo tee /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker

# 4. Configure UFW Firewall
echo "==> Configuring UFW firewall rules..."
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
sudo ufw status verbose

# 5. Create deployment folder structure
DEPLOY_DIR="/opt/health"
echo "==> Creating deployment directory at $DEPLOY_DIR..."
sudo mkdir -p "$DEPLOY_DIR"
sudo mkdir -p "$DEPLOY_DIR/infra/nginx/conf.d"
sudo mkdir -p /var/www/certbot

if [ "$USER" != "root" ]; then
    sudo chown -R "$USER":"$USER" "$DEPLOY_DIR"
fi

echo "==> VPS Setup completed successfully!"
echo "==> Deployment folder ready at: $DEPLOY_DIR"
echo "==> Make sure to add GitHub Actions secrets (VPS_HOST, VPS_USERNAME, VPS_SSH_KEY, PROD_ENV_FILE) in your repository."
