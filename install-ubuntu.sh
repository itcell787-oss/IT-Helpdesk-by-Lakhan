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

echo "📦 1. Updating apt package lists and installing curl, git, build-essential..."
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

# Install PM2 and tsx globally for reliable process management
echo "📦 3. Installing PM2 and tsx globally..."
npm install -g pm2 tsx

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

# Ensure data directory and backups directory exist
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/backups"

# CRITICAL ZERO-DATA-LOSS CHECK: Never overwrite existing database if already present!
if [ -f "$APP_DIR/data/database.json" ] && [ -s "$APP_DIR/data/database.json" ]; then
  echo "🛡️  Existing production database detected! Preserving all live users, tickets, and assets."
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  cp "$APP_DIR/data/database.json" "$APP_DIR/backups/install_preserve_$TIMESTAMP.json"
  echo "   ✓ Safety backup preserved in: $APP_DIR/backups/install_preserve_$TIMESTAMP.json"
elif [ -f "$APP_DIR/data/database.seed.json" ]; then
  echo "📂 Initializing production database from seed..."
  cp "$APP_DIR/data/database.seed.json" "$APP_DIR/data/database.json"
fi

# Ensure Git never overwrites the live production database
git update-index --assume-unchanged "$APP_DIR/data/database.json" 2>/dev/null || true
git update-index --skip-worktree "$APP_DIR/data/database.json" 2>/dev/null || true

# Start with PM2
echo "🚀 7. Starting IT Helpdesk with PM2..."
pm2 delete it-helpdesk 2>/dev/null || true

# Determine tsx runner path
if [ -f "$APP_DIR/node_modules/.bin/tsx" ]; then
  pm2 start "$APP_DIR/node_modules/.bin/tsx" --name "it-helpdesk" -- server.ts
elif command -v tsx &> /dev/null; then
  pm2 start tsx --name "it-helpdesk" -- server.ts
else
  pm2 start npm --name "it-helpdesk" -- run start
fi

pm2 save

# Setup PM2 startup system hook
echo "⚙️  8. Configuring system startup daemon..."
REAL_USER="${SUDO_USER:-$(whoami)}"
USER_HOME=$(eval echo ~$REAL_USER)
pm2 startup systemd -u "$REAL_USER" --hp "$USER_HOME" 2>/dev/null || true

echo ""
echo "=========================================================="
echo "  ✅ IT Helpdesk by Lakhan is now running!"
echo "  Access URL: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Initial Super Admin: admin@lakhanglobal.com / L@khan@123"
echo "=========================================================="
echo ""
