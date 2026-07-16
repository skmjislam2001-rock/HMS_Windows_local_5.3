#!/usr/bin/env bash
# ============================================================
#  MediCore HMS — One-Click Start (Linux / macOS)
#  Builds the app, downloads cloudflared if missing, starts
#  the local server + Cloudflare tunnel, and emails you the link.
# ============================================================
set -e
cd "$(dirname "$0")"

echo ""
echo "  ======================================== "
echo "   MediCore HMS — One-Click Start          "
echo "  ======================================== "
echo ""

# --- 1. Install dependencies if needed ---
if [ ! -d "node_modules" ]; then
  echo "  [1/4] Installing dependencies..."
  npm install
else
  echo "  [1/4] Dependencies OK."
fi

# --- 2. Build the web app ---
echo "  [2/4] Building app..."
npm run build

# --- 3. Ensure cloudflared is present ---
if [ ! -f "cloudflared" ]; then
  echo "  [3/4] Downloading cloudflared..."
  ARCH=$(uname -m)
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then ARCH="arm64"; fi
  URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-${OS}-${ARCH}"
  if curl -fsSL "$URL" -o cloudflared 2>/dev/null; then
    chmod +x cloudflared
    echo "       cloudflared downloaded."
  else
    echo "       Download failed — tunnel will be skipped. You can still use the LAN link."
  fi
else
  echo "  [3/4] cloudflared OK."
fi

# --- 4. Start local server + tunnel ---
echo "  [4/4] Starting server + tunnel..."
echo ""
node local-server/serve.mjs
