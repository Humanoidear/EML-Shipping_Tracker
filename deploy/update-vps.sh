#!/usr/bin/env bash
#
# Update the EML Shipping Tracker deployment on the VPS — everything runs
# in Docker Compose (postgres + backend + frontend/nginx).
#
# Prerequisites: initial setup done (deploy/setup-vps.sh).
#
# Usage on the VPS:
#   sudo bash /path/to/EML-Shipping_Tracker/deploy/update-vps.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== [1/3] Pulling latest code ==="
cd "$REPO_ROOT"
git pull --ff-only

echo "=== [2/3] Freeing port 80 (stopping legacy host Nginx if present) ==="
if command -v systemctl >/dev/null 2>&1; then
  systemctl disable --now nginx 2>/dev/null || true
fi
pkill -f "^nginx: master" 2>/dev/null || true
sleep 1

echo "=== [3/3] Rebuilding & restarting services ==="
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "=== Update complete ==="
echo "Web app:    http://YOUR_VPS_IP/"
echo "Status:     docker compose -f docker-compose.prod.yml ps"
