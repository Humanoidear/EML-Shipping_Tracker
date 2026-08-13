#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== [1/3] Building frontend ==="
cd frontend
npm run build
cd "$ROOT"

echo "=== [2/3] Preparing icons ==="
mkdir -p build
if [ ! -f build/icon.png ]; then
  cp frontend/public/img/logo.png build/icon.png
fi
sips -z 1024 1024 frontend/public/img/logo.png --out build/icon.png >/dev/null 2>&1 || true

echo "=== [3/3] Packaging Electron app ==="
npx electron-builder

echo ""
echo "=== Build complete ==="
echo "Output:"
ls -la "$ROOT/dist" 2>/dev/null || echo "  (check the dist/ folder)"
