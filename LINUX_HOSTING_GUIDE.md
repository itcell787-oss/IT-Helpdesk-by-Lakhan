# Complete Ubuntu & Linux Docker Hosting Guide - IT Helpdesk by Lakhan

This guide explains how to export **IT Helpdesk by Lakhan** from Google AI Studio and run it in **Docker** on your local **Ubuntu server or desktop** (Ubuntu 20.04, 22.04, 24.04 LTS), with full data persistence and network access.

---

## Table of Contents
1. [Exporting / Transferring from AI Studio to Ubuntu](#1-exporting--transferring-from-ai-studio-to-ubuntu)
2. [Quick One-Command Setup (Automated)](#2-quick-one-command-setup-automated)
3. [Manual Docker & Docker Compose Setup](#3-manual-docker--docker-compose-setup)
4. [Accessing the App (Localhost & LAN)](#4-accessing-the-app-localhost--lan)
5. [Data Persistence & Backup / Restore](#5-data-persistence--backup--restore)
6. [Managing the Container (Logs, Restart, Stop)](#6-managing-the-container-logs-restart-stop)
7. [Optional: Nginx Reverse Proxy (Port 80 / 443 & Domain Name)](#7-optional-nginx-reverse-proxy-port-80--443--domain-name)
8. [Troubleshooting & FAQs](#8-troubleshooting--faqs)

---

## 1. Exporting / Transferring from AI Studio to Ubuntu

You can transfer the project code to your Ubuntu server using any of these simple methods:

### Method A: Download ZIP from AI Studio
1. In the AI Studio interface, click on the **Export** or **Download Code** button (or Git commit icon) to download the ZIP file to your computer.
2. Transfer the ZIP to your Ubuntu server via SCP or SFTP:
   ```bash
   scp it-helpdesk.zip user@<your-ubuntu-server-ip>:~/
   ```
3. On your Ubuntu server, extract the project:
   ```bash
   sudo apt install -y unzip
   unzip it-helpdesk.zip -d ~/it-helpdesk
   cd ~/it-helpdesk
   ```

### Method B: Git Clone (GitHub / GitLab)
If your AI Studio workspace is connected to a GitHub repository:
```bash
git clone https://github.com/<your-username>/<your-repo>.git ~/it-helpdesk
cd ~/it-helpdesk
```

---

## 2. Quick One-Command Setup (Automated)

Inside your project folder on Ubuntu (`~/it-helpdesk`), run the provided automated deployment script:

```bash
chmod +x deploy-docker-ubuntu.sh
./deploy-docker-ubuntu.sh
```

**What this script does automatically:**
- Checks if Docker Engine and Docker Compose are installed; if not, installs official Docker packages.
- Starts the Docker system service.
- Prepares the persistent `/app/data` volume so your tickets, users, and audit logs are permanently stored.
- Builds the optimized production Docker image and runs the container on port `3000`.
- Waits for the backend health check (`http://localhost:3000/api/health`) to pass.
- Prints the exact clickable URLs to open on localhost and across your local network.

---

## 3. Manual Docker & Docker Compose Setup

If you prefer running commands manually step-by-step:

### Step 3.1: Install Docker on Ubuntu (if not installed)
```bash
sudo apt update
sudo apt install -y curl ca-certificates gnupg

# Add Docker official GPG key and repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker and allow non-root user
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(If you just added your user to the `docker` group, run `newgrp docker` or log out and log back in).*

### Step 3.2: Build and Start Container
Inside `~/it-helpdesk`:
```bash
# Start in background with auto-restart
docker compose up -d --build
```

### Step 3.3: Verify Running Status
```bash
# Check container status
docker compose ps

# View live application logs
docker compose logs -f
```

---

## 4. Accessing the App (Localhost & LAN)

### Access from the Ubuntu Server:
Open your browser and navigate to:
```
http://localhost:3000
```

### Access from other PCs / Phones on the same Local Network (LAN):
1. Find your Ubuntu server's local IP address:
   ```bash
   hostname -I | awk '{print $1}'
   ```
   *(Example output: `192.168.1.150`)*

2. Open the port on the Ubuntu firewall (UFW) if enabled:
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw reload
   ```

3. From any other computer, laptop, or smartphone connected to the same Wi-Fi / office network, open:
   ```
   http://192.168.1.150:3000
   ```

---

## 5. Data Persistence & Backup / Restore

All data (tickets, organizations, users, assets, knowledge base articles, SLA policies, and audit logs) is stored in `/app/data/database.json`.

In `docker-compose.yml`, a persistent volume named `helpdesk_data` is configured. When you stop, restart, or rebuild the Docker container, **your database is completely preserved**.

### Backing Up the Database:
To take an instant backup of your database:
```bash
docker compose cp it-helpdesk:/app/data/database.json ./backup-$(date +%F).json
```

### Restoring a Backup:
To restore an existing database into the Docker container:
```bash
# 1. Stop the container
docker compose down

# 2. Copy the backup file into the volume
docker run --rm -v it-helpdesk_helpdesk_data:/data -v $(pwd):/backup alpine cp /backup/database.json /data/database.json

# 3. Start the container
docker compose up -d
```

### Direct Host Directory Mounting (Optional):
If you prefer storing the database directly in a folder on your Ubuntu server (`~/it-helpdesk/data/database.json`), simply edit `docker-compose.yml`:
```yaml
volumes:
  - ./data:/app/data
```
Then run `docker compose up -d`.

---

## 6. Managing the Container (Logs, Restart, Stop)

| Action | Command |
| :--- | :--- |
| **Start / Run in background** | `docker compose up -d` |
| **Rebuild after code changes** | `docker compose up -d --build` |
| **View real-time logs** | `docker compose logs -f` |
| **Restart container** | `docker compose restart` |
| **Stop container** | `docker compose down` |
| **Check health & resource usage** | `docker stats it-helpdesk-lakhan` |
| **Open a shell inside the container** | `docker compose exec it-helpdesk sh` |

---

## 7. Optional: Nginx Reverse Proxy (Port 80 / 443 & Domain Name)

To run on standard HTTP (`80`) or HTTPS (`443`) with a local domain like `http://helpdesk.local` or an internal DNS name:

### Step 7.1: Install Nginx on Ubuntu
```bash
sudo apt install -y nginx
```

### Step 7.2: Configure Nginx
Create `/etc/nginx/sites-available/it-helpdesk`:
```nginx
server {
    listen 80;
    server_name helpdesk.local 192.168.1.150; # Replace with your IP or domain

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 7.3: Enable and Reload Nginx
```bash
sudo ln -s /etc/nginx/sites-available/it-helpdesk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 8. Troubleshooting & FAQs

### Q1: `docker: command not found` or `permission denied while trying to connect to the Docker daemon socket`
**Fix:** Run:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Q2: Port 3000 is already in use
**Fix:** Change the host port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Now access at http://localhost:8080
```
Then run `docker compose up -d`.

### Q3: How to test the backend API health status?
**Fix:** Run:
```bash
curl http://localhost:3000/api/health
```
It will return:
```json
{"status":"ok","app":"IT Helpdesk by Lakhan","version":"1.0.0","uptime":120,...}
```
