#!/usr/bin/env bash
#
# One-time VPS setup: install Nginx, configure reverse proxy for EML backend,
# open firewall ports 80/443, keep SSH (22) open.
#
# Usage on the VPS:
#   cd /opt/eml-shipping-tracker
#   sudo bash deploy/setup-vps.sh
#
set -e

CONF_SRC="/opt/eml-shipping-tracker/deploy/nginx-eml.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/eml"
NGINX_ENABLED="/etc/nginx/sites-enabled/eml"

echo "=== [1/5] Installing Nginx ==="
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

echo "=== [2/5] Installing config ==="
if [ ! -f "$CONF_SRC" ]; then
  echo "ERROR: $CONF_SRC not found. Run this script from the project root (or fix CONF_SRC)." >&2
  exit 1
fi
cp "$CONF_SRC" "$NGINX_AVAILABLE"

# Remove the default site to avoid conflicts (it also listens on port 80).
rm -f /etc/nginx/sites-enabled/default

ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

echo "=== [3/5] Testing config ==="
nginx -t

echo "=== [4/5] Reloading Nginx ==="
systemctl enable nginx
systemctl reload nginx
systemctl status nginx --no-pager | head -5

echo "=== [5/5] Firewall ==="
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
echo "Test locally on the VPS:   curl -i http://127.0.0.1/api/auth/me"
echo "Test from your Mac:        curl -i http://YOUR_VPS_IP/api/auth/me"
