#!/usr/bin/env bash
#
# One-time VPS setup for EML Shipping Tracker: install Docker, prepare .env,
# start everything via Docker Compose (postgres + backend + frontend/nginx),
# open firewall ports 80/443, keep SSH (22) open.
#
# Usage on the VPS (from a checkout of the repo):
#   sudo bash /path/to/EML-Shipping_Tracker/deploy/setup-vps.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== [1/4] Installing Docker ==="
if ! command -v docker >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | bash
  else
    echo "ERROR: Docker not found and apt-get not available. Install Docker manually." >&2
    exit 1
  fi
fi
docker --version
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose plugin not available." >&2
  exit 1
fi

echo "=== [2/4] Preparing .env ==="
if [ ! -f "$REPO_ROOT/.env" ]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  echo "Created .env from .env.example — EDIT IT and set strong secrets:"
  echo "  sed -i 's/change-me-to-a-random-string/$(openssl rand -hex 24)/' $REPO_ROOT/.env"
  echo "  sed -i 's/change-me-to-another-random-string/$(openssl rand -hex 24)/' $REPO_ROOT/.env"
else
  echo ".env already exists, leaving it untouched."
fi

echo "=== [3/4] Building & starting services ==="
cd "$REPO_ROOT"
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps

echo "=== [4/4] Firewall ==="
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
echo "Test the API from the VPS:       curl -i http://127.0.0.1/api/auth/me"
echo "Create the initial admin:        curl -X POST http://127.0.0.1/api/auth/seed-admin"
echo "Update later:                    sudo bash deploy/update-vps.sh"
echo ""
echo "NOTE: this serves plain HTTP. For HTTPS you need a domain name"
echo "      (Let's Encrypt does not issue certificates for raw IPs)."
