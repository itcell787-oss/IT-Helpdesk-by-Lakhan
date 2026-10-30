#!/bin/bash
# ==============================================================================
# IT Helpdesk by Lakhan - One-Click Database Restore Script
# Usage: ./restore-db.sh [backup_file_path]
# If no argument is provided, it restores the latest backup from backups/
# ==============================================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$APP_DIR/backups"

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    if [ -f "$BACKUP_DIR/latest_active_db.json" ]; then
        BACKUP_FILE="$BACKUP_DIR/latest_active_db.json"
    else
        LATEST=$(ls -t "$BACKUP_DIR"/database_*.json 2>/dev/null | head -n 1 || true)
        if [ -n "$LATEST" ]; then
            BACKUP_FILE="$LATEST"
        fi
    fi
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: No valid backup file found to restore!"
    echo "Usage: ./restore-db.sh backups/database_backup_YYYYMMDD_HHMMSS.json"
    exit 1
fi

echo "⚠️  Restoring database from: $BACKUP_FILE"
mkdir -p "$APP_DIR/data"
cp -f "$BACKUP_FILE" "$APP_DIR/data/database.json"

echo "🔄 Restarting application service..."
if command -v pm2 &> /dev/null && pm2 list | grep -q "it-helpdesk"; then
    pm2 restart it-helpdesk
fi

echo "✅ Database restore completed successfully! Application refreshed."
