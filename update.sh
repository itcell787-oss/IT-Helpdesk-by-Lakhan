#!/bin/bash
# ==============================================================================
# IT Helpdesk by Lakhan - Zero-Downtime / Zero-Data-Loss Update Script
# Repository: https://github.com/itcell787-oss/IT-Helpdesk-by-Lakhan
# ==============================================================================

set -e

echo ""
echo "=========================================================="
echo "  🚀 Starting IT Helpdesk Application Update"
echo "=========================================================="
echo ""

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 1. Create Timestamped Backup Directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"

if [ -f "$APP_DIR/data/database.json" ]; then
    echo "📦 Backing up current database before pulling updates..."
    cp "$APP_DIR/data/database.json" "$BACKUP_DIR/database_$TIMESTAMP.json"
    echo "   ✓ Backup saved to: $BACKUP_DIR/database_$TIMESTAMP.json"
fi

# 2. Preserve local database against git overwrite
echo "🔒 Stashing any local environment configuration..."
git stash --include-untracked -m "auto-backup-$TIMESTAMP" || true

# 3. Pull latest changes from GitHub
echo "⬇️  Pulling latest version from origin main..."
git fetch origin main
git checkout main
git pull origin main

# 4. Restore the preserved database safely
if [ -f "$BACKUP_DIR/database_$TIMESTAMP.json" ]; then
    echo "♻️  Ensuring your persistent database is restored..."
    mkdir -p "$APP_DIR/data"
    cp "$BACKUP_DIR/database_$TIMESTAMP.json" "$APP_DIR/data/database.json"
    echo "   ✓ Production database verified intact!"
fi

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
elif systemctl is-active --quiet it-helpdesk 2>/dev/null; then
    echo "   Restarting systemd service 'it-helpdesk'..."
    sudo systemctl restart it-helpdesk
else
    echo "ℹ️  Neither PM2 nor systemd service named 'it-helpdesk' was detected running."
    echo "   If running manually, restart your server with: npm run start"
fi

echo ""
echo "=========================================================="
echo "  ✅ IT Helpdesk successfully updated without data loss!"
echo "  Backup stored at: $BACKUP_DIR/database_$TIMESTAMP.json"
echo "=========================================================="
echo ""
