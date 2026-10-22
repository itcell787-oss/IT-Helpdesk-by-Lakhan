#!/usr/bin/env bash
# ==============================================================================
# IT Helpdesk by Lakhan - Automated Ubuntu Docker Setup & Launch Script
# ==============================================================================
# This script configures and launches the IT Helpdesk application inside Docker
# on any Ubuntu 20.04 / 22.04 / 24.04 LTS server or desktop.
# ==============================================================================

set -e

# ANSI Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "================================================================================"
echo "         🚀 IT Helpdesk by Lakhan - Ubuntu Docker Deployment Script             "
echo "================================================================================"
echo -e "${NC}"

# Check for root/sudo
IS_ROOT=false
if [ "$EUID" -eq 0 ]; then
  IS_ROOT=true
fi

# Detect Docker installation
echo -e "${YELLOW}🔍 Step 1: Checking Docker & Docker Compose installation...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Docker is not installed on this Ubuntu system.${NC}"
  echo -e "Installing official Docker Engine via get.docker.com..."
  if [ "$IS_ROOT" = false ]; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh
    sudo usermod -aG docker "$USER"
    echo -e "${GREEN}✓ Docker installed successfully.${NC}"
    echo -e "${YELLOW}NOTE: If you encounter permission errors, run: newgrp docker${NC}"
  else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    echo -e "${GREEN}✓ Docker installed successfully.${NC}"
  fi
else
  echo -e "${GREEN}✓ Docker is already installed: $(docker --version)${NC}"
fi

# Ensure Docker service is running
if command -v systemctl &> /dev/null; then
  if ! systemctl is-active --quiet docker; then
    echo -e "${YELLOW}Starting Docker daemon...${NC}"
    if [ "$IS_ROOT" = false ]; then
      sudo systemctl start docker
      sudo systemctl enable docker
    else
      systemctl start docker
      systemctl enable docker
    fi
  fi
fi

# Determine compose command
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo -e "${YELLOW}Installing Docker Compose plugin...${NC}"
  if [ "$IS_ROOT" = false ]; then
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
  else
    apt-get update && apt-get install -y docker-compose-plugin
  fi
  COMPOSE_CMD="docker compose"
fi

echo -e "${GREEN}✓ Using Compose: ${COMPOSE_CMD}${NC}"

# Step 1.5: Ensure docker-buildx is installed to prevent Bake warnings on Ubuntu 24.04
if ! docker buildx version &> /dev/null; then
  echo -e "${YELLOW}Installing docker-buildx-plugin for Ubuntu...${NC}"
  if [ "$IS_ROOT" = false ]; then
    sudo apt-get update -qq && sudo apt-get install -y -qq docker-buildx-plugin 2>/dev/null || true
  else
    apt-get update -qq && apt-get install -y -qq docker-buildx-plugin 2>/dev/null || true
  fi
fi

# Step 2: Prepare local data directory
echo -e "\n${YELLOW}📁 Step 2: Preparing persistent database volume...${NC}"
mkdir -p data
if [ "$IS_ROOT" = true ]; then
  chmod 777 data
fi
echo -e "${GREEN}✓ Data persistence directory ready.${NC}"

# Step 3: Check port 3000 availability
echo -e "\n${YELLOW}🔌 Step 3: Checking Port 3000...${NC}"
if command -v ss &> /dev/null; then
  if ss -tuln | grep -q ':3000 '; then
    echo -e "${YELLOW}⚠️  Port 3000 is currently in use. Existing containers or processes may conflict.${NC}"
  else
    echo -e "${GREEN}✓ Port 3000 is available.${NC}"
  fi
fi

# Step 3.5: Ensure Dockerfile and .dockerignore exist
if [ ! -f "Dockerfile" ]; then
  echo -e "${YELLOW}Creating missing Dockerfile...${NC}"
  cat << 'EOF' > Dockerfile
# Multi-stage Dockerfile for IT Helpdesk by Lakhan
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/tsconfig.json ./

# Ensure data directory exists for persistent database
RUN mkdir -p /app/data

# Data directory for file-backed JSON database
VOLUME ["/app/data"]

EXPOSE 3000

# Healthcheck to verify the server and database are healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })" || exit 1

CMD ["npx", "tsx", "server.ts"]
EOF
  echo -e "${GREEN}✓ Dockerfile generated.${NC}"
fi

if [ ! -f ".dockerignore" ]; then
  cat << 'EOF' > .dockerignore
node_modules
dist
.git
.gitignore
.env
.env.local
.DS_Store
*.log
.aistudio
EOF
fi

# Step 4: Build and start container
echo -e "\n${YELLOW}🏗️  Step 4: Building and starting IT Helpdesk container...${NC}"
echo -e "This builds the optimized production Vite bundle and Node.js TS backend..."

# Attempt compose down first
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

# Try building with docker compose; if buildx/bake fails, build directly with docker build
if ! $COMPOSE_CMD up -d --build; then
  echo -e "${YELLOW}Standard compose build encountered a driver issue. Falling back to direct docker build...${NC}"
  docker build -t it-helpdesk-lakhan:latest .
  $COMPOSE_CMD up -d
fi

# Step 5: Wait for server readiness
echo -e "\n${YELLOW}⏳ Step 5: Waiting for IT Helpdesk server to be healthy...${NC}"
MAX_RETRIES=20
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
  if curl -s -f http://localhost:3000/api/health &> /dev/null; then
    HEALTHY=true
    break
  fi
  COUNT=$((COUNT + 1))
  sleep 2
  echo -n "."
done
echo ""

if [ "$HEALTHY" = true ]; then
  echo -e "${GREEN}${BOLD}✓ IT Helpdesk is UP and RUNNING!${NC}"
else
  echo -e "${YELLOW}Container started, but initial health check took longer than expected.${NC}"
  echo -e "You can inspect live logs with: ${BOLD}${COMPOSE_CMD} logs -f${NC}"
fi

# Step 6: Display Access URLs
echo -e "\n${CYAN}${BOLD}================================================================================"
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "================================================================================${NC}"

# Find host IPs
PRIMARY_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR-SERVER-IP")

echo -e "You can now access your IT Helpdesk by Lakhan at:"
echo -e "  • Local Machine:   ${GREEN}${BOLD}http://localhost:3000${NC}"
if [ -n "$PRIMARY_IP" ] && [ "$PRIMARY_IP" != "YOUR-SERVER-IP" ]; then
  echo -e "  • LAN / Network:   ${GREEN}${BOLD}http://${PRIMARY_IP}:3000${NC}"
fi

echo -e "\n${BOLD}Quick Management Commands:${NC}"
echo -e "  • View Live Logs:     ${CYAN}${COMPOSE_CMD} logs -f${NC}"
echo -e "  • Restart Service:    ${CYAN}${COMPOSE_CMD} restart${NC}"
echo -e "  • Stop Service:       ${CYAN}${COMPOSE_CMD} down${NC}"
echo -e "  • Check Status:       ${CYAN}${COMPOSE_CMD} ps${NC}"
echo -e "  • Backup Database:    ${CYAN}docker cp it-helpdesk-lakhan:/app/data/database.json ./backup-\$(date +%F).json${NC}"
echo -e "================================================================================\n"
