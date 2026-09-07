#!/usr/bin/env bash
#
# One-time VPS setup: build frontend, install Nginx, serve web app + API proxy,
# open firewall ports 80/443, keep SSH (22) open.
#
# Usage on the VPS (from the project root):
#   sudo bash deploy/setup-vps.sh
#
set -e

# Resolve project root from this script's own location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONF_SRC="$SCRIPT_DIR/nginx-eml.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/eml"
NGINX_ENABLED="/etc/nginx/sites-enabled/eml"
WEB_ROOT="/var/www/eml"

echo "=== [1/6] Installing Node.js (if missing) ==="
if ! command -v node >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  else
    echo "ERROR: Node.js not found and apt-get not available. Install Node 18+ manually." >&2
    exit 1
  fi
fi
node -v

echo "=== [2/6] Building frontend ==="
cd "$PROJECT_ROOT/frontend"
if [ ! -d node_modules ]; then
  npm ci
fi
npm run build
cd "$PROJECT_ROOT"

echo "=== [3/6] Installing Nginx ==="
if ! command -v nginx >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y nginx
  else
    echo "ERROR: Nginx not found and apt-get not available. Install Nginx manually." >&2
    exit 1
  fi
fi
nginx -v

echo "=== [4/6] Installing config + web app ==="
if [ ! -f "$CONF_SRC" ]; then
  echo "ERROR: $CONF_SRC not found." >&2
  exit 1
fi
cp "$CONF_SRC" "$NGINX_AVAILABLE"

# Remove the default site to avoid conflicts (it also listens on port 80).
rm -f /etc/nginx/sites-enabled/default

ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

# Deploy the static web app.
mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
cp -r "$PROJECT_ROOT/frontend/dist/." "$WEB_ROOT/"

echo "=== [5/6] Testing config + reloading Nginx ==="
nginx -t
systemctl enable nginx
systemctl reload nginx
systemctl status nginx --no-pager | head -5

echo "=== [6/6] Firewall ==="
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw status
else
  echo "UFW not present - ensure ports 80 (and 443 if you add HTTPS later) are open on the VPS provider firewall."
fi

echo ""
echo "=== Setup complete ==="
echo "Web app:   http://YOUR_VPS_IP"
echo "API:       http://YOUR_VPS_IP/api"
echo ""
echo "Test locally on the VPS:   curl -i http://127.0.0.1/api/auth/me"
echo "Test from your Mac:        curl -i http://YOUR_VPS_IP/api/auth/me"
