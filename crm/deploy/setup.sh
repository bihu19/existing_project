#!/bin/bash
# =============================================================
# CRM Deployment Script for Hostinger VPS
# Domain: libconsulting-thai.cloud
#
# Run this script on your VPS as root or with sudo:
#   chmod +x deploy/setup.sh
#   sudo bash deploy/setup.sh
# =============================================================

set -e

DOMAIN="libconsulting-thai.cloud"
APP_DIR="/var/www/crm"
REPO_URL="https://github.com/bihu19/existing_project.git"

echo "========================================="
echo "  CRM Deployment - $DOMAIN"
echo "========================================="

# ----- Step 1: System packages -----
echo ""
echo "[1/7] Installing system packages..."
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx

# ----- Step 2: Node.js 20 via nvm -----
echo ""
echo "[2/7] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node -v
npm -v

# ----- Step 3: PM2 -----
echo ""
echo "[3/7] Installing PM2..."
npm install -g pm2

# ----- Step 4: Clone and build -----
echo ""
echo "[4/7] Setting up application..."
mkdir -p "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
    echo "Repo already cloned, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR/repo-tmp"
    cp -r "$APP_DIR/repo-tmp/crm/." "$APP_DIR/"
    rm -rf "$APP_DIR/repo-tmp"
fi

cd "$APP_DIR"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    # Generate a random session secret
    SESSION_SECRET=$(openssl rand -base64 32)
    sed -i "s|change-me-to-a-random-string|$SESSION_SECRET|" .env
    echo ""
    echo "  >>> .env created with a random SESSION_SECRET"
    echo "  >>> Review /var/www/crm/.env before continuing"
fi

echo "Installing dependencies..."
npm ci --production=false

echo "Setting up database..."
npx prisma generate
npx prisma db push

echo "Building Next.js..."
npm run build

# ----- Step 5: Nginx -----
echo ""
echo "[5/7] Configuring nginx..."
cp deploy/nginx.conf "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ----- Step 6: SSL certificate -----
echo ""
echo "[6/7] Obtaining SSL certificate..."
echo "  Make sure DNS is already pointing to this server!"
echo ""
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN || {
    echo ""
    echo "  >>> SSL failed. DNS may not be pointing here yet."
    echo "  >>> Run this later: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    echo "  >>> The site will still work on HTTP in the meantime."
}

# ----- Step 7: Start with PM2 -----
echo ""
echo "[7/7] Starting application with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "========================================="
echo ""
echo "  Site:    https://$DOMAIN"
echo "  App dir: $APP_DIR"
echo ""
echo "  Next steps:"
echo "  1. Create admin user:  cd $APP_DIR && npm run create-admin"
echo "  2. Check status:       pm2 status"
echo "  3. View logs:          pm2 logs crm"
echo ""
