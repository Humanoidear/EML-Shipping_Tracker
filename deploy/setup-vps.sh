#!/usr/bin/env bash
#
# One-time VPS setup: install Nginx, build & install the web app, configure
# the reverse proxy for the EML backend, open firewall ports 80/443, keep SSH (22) open.
#
# Prerequisites: this script must run on the VPS from a checkout of the repo,
# and the backend must already be running via `docker compose -f docker-compose.prod.yml up -d`.
#
# Usage on the VPS:
#   sudo bash /path/to/EML-Shipping_Tracker/deploy/setup-vps.sh
#
set -e

# Resolve paths from this script's own location (works regardless of
# where the project was placed, e.g. /opt/EML-Shipping_Tracker).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONF_SRC="$SCRIPT_DIR/nginx-eml.conf"
WEB_ROOT="/var/www/eml"
NGINX_AVAILABLE="/etc/nginx/sites-available/eml"
NGINX_ENABLED="/etc/nginx/sites-enabled/eml"

echo "=== [1/6] Installing Nginx ==="
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

echo "=== [2/6] Installing config ==="
if [ ! -f "$CONF_SRC" ]; then
  echo "ERROR: $CONF_SRC not found." >&2
  exit 1
fi
cp "$CONF_SRC" "$NGINX_AVAILABLE"

# Remove the default site to avoid conflicts (it also listens on port 80).
rm -f /etc/nginx/sites-enabled/default

ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

echo "=== [3/6] Installing Node.js (for the frontend build) ==="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "=== [4/6] Building & installing web app ==="
mkdir -p "$WEB_ROOT"
cd "$REPO_ROOT/frontend"
npm ci
npm run build
cp -R dist/. "$WEB_ROOT/"
echo "Web app installed at $WEB_ROOT"

echo "=== [5/6] Testing & reloading Nginx ==="
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
echo "Open the web app in a browser:   http://YOUR_VPS_IP/"
echo "Test the API on the VPS:         curl -i http://127.0.0.1/api/auth/me"
echo "Test the API from your Mac:      curl -i http://YOUR_VPS_IP/api/auth/me"
echo ""
echo "NOTE: this serves plain HTTP. For HTTPS you need a domain name"
echo "      (Let's Encrypt does not issue certificates for raw IPs)."
