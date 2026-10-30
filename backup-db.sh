#!/bin/bash
# ==============================================================================
# IT Helpdesk by Lakhan - One-Click Database Backup Script
# Usage: ./backup-db.sh
# ==============================================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$APP_DIR/backups"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$APP_DIR/data/database.json" ]; then
    echo "❌ Error: $APP_DIR/data/database.json not found!"
    exit 1
fi

DEST="$BACKUP_DIR/database_backup_$TIMESTAMP.json"
cp "$APP_DIR/data/database.json" "$DEST"
cp "$APP_DIR/data/database.json" "$BACKUP_DIR/latest_active_db.json"

echo "✅ Backup successfully created!"
echo "📁 Saved to: $DEST"
echo "📊 Database size: $(wc -c < "$DEST") bytes"
