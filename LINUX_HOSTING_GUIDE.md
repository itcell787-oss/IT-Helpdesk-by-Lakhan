# Local Linux Server Hosting Guide - IT Helpdesk by Lakhan

This guide walks through deploying, running, and managing **IT Helpdesk by Lakhan** on any on-premises or cloud Linux distribution (Ubuntu, Debian, Red Hat Enterprise Linux, Rocky Linux, AlmaLinux, CentOS Stream, Arch, or Alpine).

---

## 1. Quick One-Line Automated Setup

On your Linux server, run the automated installation script:

```bash
chmod +x setup-linux.sh
sudo ./setup-linux.sh
```

This will automatically:
1. Verify/install Node.js 22.x LTS and npm
2. Set up `/data` persistence folder with proper permissions
3. Install production dependencies
4. Build optimized frontend bundles
5. Configure systemd service `it-helpdesk.service` and start the server

---

## 2. Manual Systemd Installation (Ubuntu / Debian / RHEL)

### Step 1: Install Node.js & Git
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y curl git ufw nginx

# Install Node.js 22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Clone or Copy Application Files
```bash
sudo mkdir -p /var/www/it-helpdesk
sudo chown -R $USER:$USER /var/www/it-helpdesk
cd /var/www/it-helpdesk

# Copy or unpack app files here
npm install
npm run build
```

### Step 3: Install Systemd Service
```bash
sudo cp it-helpdesk.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now it-helpdesk
```

Verify service status:
```bash
sudo systemctl status it-helpdesk
```

Check live logs:
```bash
sudo journalctl -u it-helpdesk -f
```

---

## 3. Docker & Docker Compose Deployment

If your Linux server runs Docker:

```bash
# Start container in background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop container
docker compose down
```

The database file is mounted locally to a Docker named volume (`helpdesk_data`), so data is permanently preserved across container upgrades.

---

## 4. Nginx Reverse Proxy & SSL Setup

To run on standard port 80/443 with an internal domain (e.g. `http://helpdesk.company.internal` or `https://support.company.com`):

```bash
# Copy Nginx template
sudo cp nginx-it-helpdesk.conf /etc/nginx/sites-available/it-helpdesk
sudo ln -s /etc/nginx/sites-available/it-helpdesk /etc/nginx/sites-enabled/

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Setting up Free SSL with Let's Encrypt Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d helpdesk.yourcompany.com
```

---

## 5. Linux Firewall Configuration (UFW / firewalld)

### Ubuntu / Debian (UFW):
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow Web Traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If accessing port 3000 directly:
sudo ufw allow 3000/tcp

sudo ufw enable
sudo ufw status
```

### RHEL / CentOS / Rocky Linux (firewalld):
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 6. Email Gateways & Mail Server Ports for Linux Admins

When connecting Admin mailboxes and Default system reply gateways:

| Protocol | Standard Port | Security | Description |
| :--- | :--- | :--- | :--- |
| **IMAP** | `993` | SSL/TLS | Secure inbound mailbox retrieval |
| **POP3** | `995` | SSL/TLS | Secure inbound polling |
| **SMTP** | `587` | STARTTLS | Secure outbound mail submission |
| **SMTP** | `465` | SSL/TLS | Secure outbound mail submission |
| **SMTP (Internal)** | `25` | None/Auth | Internal mail relay (Postfix / Exim) |

If your Linux server hosts an internal Postfix / Sendmail server:
* Set Outgoing Host to `127.0.0.1` or `localhost`
* Set Port to `25` or `587`

---

## 7. Backup & Disaster Recovery on Linux

### Automated Daily Cron Backup:
Add this line to crontab (`crontab -e`):

```bash
0 2 * * * cp /var/www/it-helpdesk/data/database.json /backups/helpdesk_backup_$(date +\%Y\%m\%d).json
```

### Instant Manual Backup:
```bash
tar -czvf helpdesk_data_backup_$(date +%F).tar.gz /var/www/it-helpdesk/data/
```

### Restoring a Backup:
```bash
sudo systemctl stop it-helpdesk
cp /path/to/backup.json /var/www/it-helpdesk/data/database.json
sudo systemctl start it-helpdesk
```

---

## 8. Offline / Air-Gapped Linux Environments

For secure, disconnected Linux intranets without internet access:
1. On an internet-connected machine:
   ```bash
   npm install
   npm run build
   tar -czf it-helpdesk-offline.tar.gz .
   ```
2. Transfer the `.tar.gz` archive to the secure server via USB/internal artifact repository.
3. Extract and run `node --loader tsx server.ts` or `npm run start`.
4. Zero external cloud dependencies required! Everything runs from local disk.
