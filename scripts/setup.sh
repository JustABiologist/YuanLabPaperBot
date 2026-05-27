#!/usr/bin/env bash
set -euo pipefail

echo "=== Lab Paper Bot Setup ==="
echo ""

# --- Check Node.js ---
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install Node.js >= 18 first."
  echo "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
  echo "  macOS: brew install node"
  echo "  Windows: https://nodejs.org/"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "ERROR: Node.js >= 18 required (found $(node -v)). Upgrade first."
  exit 1
fi
echo "[OK] Node.js $(node -v)"

# --- Check npm ---
if ! command -v npm &>/dev/null; then
  echo "ERROR: npm not found."
  exit 1
fi
echo "[OK] npm $(npm -v)"

# --- Install dependencies ---
echo ""
echo "Installing npm dependencies..."
npm install

# --- Create .env if missing ---
if [ ! -f .env ]; then
  echo ""
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  EDIT .env with your settings before starting!"
  echo "   Minimum: BOT_GROUP_NAME"
else
  echo "[OK] .env exists"
fi

# --- Create data directories ---
mkdir -p data/outbox data/sessions

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env with your WhatsApp group name"
echo "  2. Run: npm start"
echo "  3. Scan the QR code with your lab phone"
echo ""
echo "On the Windows machine with EndNote:"
echo "  - Set up the PowerShell watchdog (scripts/endnote-watchdog.ps1)"
echo "  - Configure EndNote PDF Auto Import to watch data/outbox/"
