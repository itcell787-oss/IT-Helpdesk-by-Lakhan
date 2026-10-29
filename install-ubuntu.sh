#!/bin/bash
# ==============================================================================
# IT Helpdesk by Lakhan - Ubuntu Server One-Click Installer
# GitHub: https://github.com/itcell787-oss/IT-Helpdesk-by-Lakhan
# ==============================================================================

set -e

echo ""
echo "=========================================================="
echo "  🚀 IT Helpdesk by Lakhan - Ubuntu Server Installation"
echo "=========================================================="
echo ""

# Ensure run as root or sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo or as root: sudo ./install-ubuntu.sh"
  exit 1
fi

echo "📦 1. Updating apt package lists and installing curl and git..."
apt-get update -y
apt-get install -y curl git build-essential

# Check Node.js
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo "📦 2. Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "   ✓ Node.js version: $(node -v)"
echo "   ✓ npm version: $(npm -v)"

# Install PM2 globally for reliable process management
echo "📦 3. Installing PM2 process manager..."
npm install -g pm2

# Install dependencies and build
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "📦 4. Installing application dependencies..."
npm install

echo "🔨 5. Building production frontend..."
npm run build

# Setup .env if missing
if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚙️  6. Creating default .env configuration..."
  cat <<EOF > "$APP_DIR/.env"
PORT=3000
NODE_ENV=production
HOST=0.0.0.0
EOF
fi

# Ensure data directory and database exists
mkdir -p "$APP_DIR/data"
if [ ! -f "$APP_DIR/data/database.json" ] && [ -f "$APP_DIR/data/database.seed.json" ]; then
  echo "📂 Initializing production database from seed..."
  cp "$APP_DIR/data/database.seed.json" "$APP_DIR/data/database.json"
fi

# Start with PM2
echo "🚀 7. Starting IT Helpdesk with PM2..."
pm2 delete it-helpdesk 2>/dev/null || true
pm2 start server.ts --name "it-helpdesk" --interpreter tsx --env NODE_ENV=production
pm2 save

# Setup PM2 startup system hook
echo "⚙️  8. Configuring system startup daemon..."
pm2 startup systemd -u $(whoami) --hp $HOME 2>/dev/null || true

echo ""
echo "=========================================================="
echo "  ✅ IT Helpdesk by Lakhan is now running!"
echo "  Access URL: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Initial Super Admin: admin@lakhanglobal.com / L@khan@123"
echo "=========================================================="
echo ""
