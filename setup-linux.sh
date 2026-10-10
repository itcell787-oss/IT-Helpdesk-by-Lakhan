#!/usr/bin/env bash
# ==============================================================================
# IT Helpdesk by Lakhan - Linux Server Installation & Setup Script
# Works on Ubuntu 20.04/22.04/24.04 LTS, Debian 11/12, CentOS/RHEL 8/9, Rocky Linux
# ==============================================================================

set -e

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}       IT Helpdesk by Lakhan - Linux Server Setup     ${NC}"
echo -e "${CYAN}======================================================${NC}"

# Check for root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}Note: Some steps (installing systemd services and packages) require sudo.${NC}"
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo -e "\n${CYAN}[1/6] Checking system prerequisites...${NC}"
if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}Node.js not found. Installing Node.js LTS (v22.x)...${NC}"
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
  else
    echo -e "${RED}Error: Package manager not recognized. Please install Node.js 20+ manually.${NC}"
    exit 1
  fi
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js detected: ${NODE_VERSION} | npm: ${NPM_VERSION}${NC}"

echo -e "\n${CYAN}[2/6] Ensuring data persistence directory exists...${NC}"
mkdir -p "$APP_DIR/data"
chmod 775 "$APP_DIR/data"
echo -e "${GREEN}✓ Directory $APP_DIR/data initialized.${NC}"

echo -e "\n${CYAN}[3/6] Installing npm dependencies...${NC}"
npm install

echo -e "\n${CYAN}[4/6] Building production web assets...${NC}"
npm run build

echo -e "\n${CYAN}[5/6] Generating default environment configuration...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "PORT=3000" >> "$APP_DIR/.env"
  echo "NODE_ENV=production" >> "$APP_DIR/.env"
  echo -e "${GREEN}✓ Created default .env configuration file.${NC}"
else
  echo -e "${GREEN}✓ Existing .env file preserved.${NC}"
fi

echo -e "\n${CYAN}[6/6] Configuring systemd service...${NC}"
SERVICE_PATH="/etc/systemd/system/it-helpdesk.service"
CURRENT_USER=${SUDO_USER:-$USER}

if [ -d "/etc/systemd/system" ]; then
  cat <<EOF > /tmp/it-helpdesk.service
[Unit]
Description=IT Helpdesk by Lakhan - Ticket Management Platform
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}
ExecStart=$(which npm) run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

# Standard log output to system journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=it-helpdesk

[Install]
WantedBy=multi-user.target
EOF

  if [ "$EUID" -eq 0 ]; then
    cp /tmp/it-helpdesk.service "$SERVICE_PATH"
    systemctl daemon-reload
    systemctl enable it-helpdesk
    systemctl restart it-helpdesk
    echo -e "${GREEN}✓ Systemd service installed and started: it-helpdesk${NC}"
    echo -e "${GREEN}  Status check: systemctl status it-helpdesk${NC}"
  else
    echo -e "${YELLOW}To install the systemd service to run automatically on boot, run:${NC}"
    echo -e "  sudo cp /tmp/it-helpdesk.service $SERVICE_PATH"
    echo -e "  sudo systemctl daemon-reload"
    echo -e "  sudo systemctl enable --now it-helpdesk"
  fi
fi

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "IT Helpdesk by Lakhan is ready to run on Linux."
echo -e "Access URL: ${CYAN}http://localhost:3000${NC}"
echo -e "To start manually: ${YELLOW}npm run start${NC}"
echo -e "To run with Docker: ${YELLOW}docker-compose up -d${NC}"
echo -e "${CYAN}======================================================${NC}"
