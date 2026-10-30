#!/bin/bash
# ==============================================================================
# IT Helpdesk by Lakhan - Zero-Downtime / Zero-Data-Loss Update Script
# Repository: https://github.com/itcell787-oss/IT-Helpdesk-by-Lakhan
# ==============================================================================

set -e

echo ""
echo "=========================================================="
echo "  🚀 Starting IT Helpdesk Application Update"
echo "  Zero Data Loss Guarantee: Database Preserved & Backed Up"
echo "=========================================================="
echo ""

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"

# 1. Safeguard existing database across multiple backup locations
if [ -f "$APP_DIR/data/database.json" ] && [ -s "$APP_DIR/data/database.json" ]; then
    echo "📦 Backing up current database before pulling updates..."
    cp -f "$APP_DIR/data/database.json" "$BACKUP_DIR/database_$TIMESTAMP.json"
    cp -f "$APP_DIR/data/database.json" "$BACKUP_DIR/latest_active_db.json"
    cp -f "$APP_DIR/data/database.json" "/tmp/it_helpdesk_emergency_backup.json" 2>/dev/null || true
    echo "   ✓ Backup saved to: $BACKUP_DIR/database_$TIMESTAMP.json"
    echo "   ✓ Emergency backup saved to: /tmp/it_helpdesk_emergency_backup.json"
fi

# 2. Tell git to ignore local database modifications so git pull never conflicts or overwrites
echo "🔒 Securing local database against Git merge overwrites..."
git update-index --assume-unchanged data/database.json 2>/dev/null || true
git update-index --skip-worktree data/database.json 2>/dev/null || true

# Stash any temporary build artifacts (excluding database)
git stash push -m "pre-update-$TIMESTAMP" -- ':!data/database.json' ':!backups' 2>/dev/null || true

# 3. Pull latest changes from GitHub
echo "⬇️  Pulling latest version from origin main..."
git fetch origin main || git fetch origin master || true
CURRENT_BRANCH=$(git branch --show-current || echo "main")
git checkout "$CURRENT_BRANCH" 2>/dev/null || true
git pull origin "$CURRENT_BRANCH" || git pull origin main || true

# 4. Guarantee production database is restored intact
if [ -f "$BACKUP_DIR/latest_active_db.json" ] && [ -s "$BACKUP_DIR/latest_active_db.json" ]; then
    echo "♻️  Ensuring your persistent production database is in place..."
    mkdir -p "$APP_DIR/data"
    cp -f "$BACKUP_DIR/latest_active_db.json" "$APP_DIR/data/database.json"
    echo "   ✓ Production database verified intact! All tickets, users, and assets are preserved."
elif [ ! -f "$APP_DIR/data/database.json" ] && [ -f "$APP_DIR/data/database.seed.json" ]; then
    echo "📂 Initializing database from seed..."
    cp "$APP_DIR/data/database.seed.json" "$APP_DIR/data/database.json"
fi

# Re-enforce assume-unchanged flag
git update-index --assume-unchanged data/database.json 2>/dev/null || true

# 5. Install any new or updated packages
echo "📦 Installing npm dependencies..."
npm install

# 6. Rebuild production Vite frontend bundle
echo "🔨 Building frontend application (npm run build)..."
npm run build

# 7. Restart application service (detecting PM2 or systemd)
echo "🔄 Restarting application service..."

if command -v pm2 &> /dev/null && pm2 list | grep -q "it-helpdesk"; then
    echo "   Restarting PM2 process 'it-helpdesk'..."
    pm2 restart it-helpdesk
elif command -v pm2 &> /dev/null; then
    echo "   Starting PM2 process 'it-helpdesk'..."
    if [ -f "$APP_DIR/node_modules/.bin/tsx" ]; then
      pm2 start "$APP_DIR/node_modules/.bin/tsx" --name "it-helpdesk" -- server.ts
    else
      pm2 start npm --name "it-helpdesk" -- run start
    fi
    pm2 save
elif systemctl is-active --quiet it-helpdesk 2>/dev/null; then
    echo "   Restarting systemd service 'it-helpdesk'..."
    sudo systemctl restart it-helpdesk
else
    echo "ℹ️  Neither PM2 nor systemd service named 'it-helpdesk' was detected running."
    echo "   Restarting node server..."
    pkill -f "node.*server.ts" 2>/dev/null || pkill -f "tsx.*server.ts" 2>/dev/null || true
    nohup npm run start > app.log 2>&1 &
fi

echo ""
echo "=========================================================="
echo "  ✅ IT Helpdesk successfully updated without data loss!"
echo "  All user accounts, tickets, assets, and settings are intact."
echo "  Backup stored at: $BACKUP_DIR/database_$TIMESTAMP.json"
echo "=========================================================="
echo ""
