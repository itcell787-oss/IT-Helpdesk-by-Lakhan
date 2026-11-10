# Enterprise IT Helpdesk & Service Management (ITSM) System

<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/life-buoy.svg" width="64" height="64" alt="IT Helpdesk Logo" />
</p>

<p align="center">
  <strong>A modern, self-hosted, enterprise-grade IT Helpdesk, Service Management, and CMDB Asset Tracking platform.</strong>
  <br />
  <em>Designed and engineered by <strong>Lakhan Prajapati</strong> (<a href="mailto:lakhan.prajapati2024@gmail.com">lakhan.prajapati2024@gmail.com</a>)</em>
</p>

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/License-GNU%20AGPLv3-blue.svg" alt="License: AGPL-3.0" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v20%20%7C%20v22%20LTS-green.svg" alt="Node.js LTS" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg" alt="React 19" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC.svg" alt="Tailwind CSS v4" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/Language-TypeScript%205-3178C6.svg" alt="TypeScript" /></a>
  <a href="#test-suite"><img src="https://img.shields.io/badge/Tests-92%2F92%20Passing-brightgreen.svg" alt="Tests: 92/92 Passing" /></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/Architecture-Full--Stack%20Express-orange.svg" alt="Full Stack Express" /></a>
</p>

---

## 📑 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Key Architecture & Design Philosophy](#-key-architecture--design-philosophy)
3. [The A to Z Feature Matrix](#-the-a-to-z-feature-matrix)
4. [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
5. [Default Personas & Testing Switcher](#-default-personas--testing-switcher)
6. [Live Custom Domain Hosting & Production Setup](#-live-custom-domain-hosting--production-setup)
7. [Email Gateway & Auto-Ingestion Setup](#-email-gateway--auto-ingestion-setup)
8. [Docker & Containerized Deployment](#-docker--containerized-deployment)
9. [REST API Reference](#-rest-api-reference)
10. [Automated Test Suite & Quality Assurance](#-automated-test-suite--quality-assurance)
11. [Disaster Recovery & Atomic Data Layer](#-disaster-recovery--atomic-data-layer)
12. [Author & License](#-author--license)

---

## 🚀 Executive Summary

**Enterprise IT Helpdesk by Lakhan** delivers the functionality and familiar workflows of enterprise-grade ITSM systems (such as ServiceNow, Jira Service Desk, and Spiceworks) in an ultra-fast, independent, fully auditable, and self-hosted software package.

* **100% On-Premise / Private Cloud Ownership:** Complete control over your data without vendor lock-in or recurring per-agent SaaS seat pricing.
* **Liquid Glass Neomorphic UI:** Clean, modern interface supporting instant Dark/Light theme switching, responsive layouts for mobile and desktop, and zero visual clutter.
* **Dual Inbound Channels:** Seamless ticket creation via both a zero-friction requester web portal (with optional OTP verification) and automated incoming email parsing with ticket threading.
* **Integrated CMDB:** Complete Configuration Management Database for workstation laptops, core network infrastructure, cloud subscriptions, and software licenses.

---

## 🏛 Key Architecture & Design Philosophy

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|  +---------------------------+  +----------------------+  +------------------+  |
|  |   Staff Helpdesk Console  |  |  End-User Self-Serve |  |   Super Admin    |  |
|  | (Technician/Manager/Admin)|  |    Portal (/portal)  |  | Executive Engine |  |
|  +---------------------------+  +----------------------+  +------------------+  |
|                       React 19 SPA + Tailwind CSS v4                            |
+---------------------------------------------------------------------------------+
                                       |
                                HTTP / REST API
                                       |
+---------------------------------------------------------------------------------+
|                                SERVER LAYER                                     |
|  +---------------------------------------------------------------------------+  |
|  |                    Node.js 22 LTS / Express 4 Server                      |  |
|  |  +------------------+  +------------------+  +-------------------------+  |  |
|  |  | Ticket Engine    |  | SLA Monitor Clocks| | Email Gateway Poller    |  |  |
|  |  | CMDB Assets      |  | RBAC Guards      |  | (IMAP/POP3/SMTP Dispatch)|  |  |
|  |  +------------------+  +------------------+  +-------------------------+  |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
                                       |
+---------------------------------------------------------------------------------+
|                                DATA LAYER                                       |
|  +---------------------------------------------------------------------------+  |
|  | Atomic ACID File-Backed Storage (/data/database.json)                     |  |
|  | Zero Database Dependencies · Instant Backup · Multi-Tenant Isolated State  |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## 📖 The A to Z Feature Matrix

### **A — Asset Management (CMDB)**
Full hardware and software lifecycle registry. Track assets from procurement to retirement (`in_stock`, `in_service`, `in_repair`, `retired`), link assets directly to owners/requesters, record serial numbers, MAC addresses, specs, and monitor financial asset valuation.

### **B — Branding & Tenant Customization**
Customize organization name, portal subheadings, support phone, and upload corporate logos in multiple aspect ratio templates (Round, Square, or Wide Banner).

### **C — CSAT Satisfaction Surveys**
Integrated post-resolution feedback loop. Automatically prompts requesters with a 1-to-5 star rating and optional comments once tickets are resolved, computing organizational satisfaction averages.

### **D — Dynamic Ticket Categories & Custom Form Builder**
Configurable incident and service request categories (`Hardware & Workstations`, `Software & Cloud Apps`, `Network & Connectivity`, `Security & Access`, etc.) with customizable custom fields and required inputs.

### **E — Email-to-Ticket Gateway & Threaded Ingestion**
Automated poller connecting to your corporate mailbox via IMAP or POP3. Parses incoming messages, strips spam, generates tickets with auto-reply acknowledgments, handles email attachments, threads follow-up emails via `[ITL-XXXXXX]` subject matching, and automatically reopens resolved tickets if the requester replies.

### **F — Fast OTP Ticket Submission**
Security mechanism for self-service requesters. Allows organizations to mandate One-Time Passcodes (OTP) dispatched via email before ticket creation, preventing automated bot abuse and unverified requests.

### **G — Group & Team Queues**
Granular team routing allowing tickets to be triaged into dedicated operational queues (Tier-1 Helpdesk, Infrastructure, DevOps, CyberSec, Facilities) with assignment rules.

### **H — Hardware & Host System Diagnostics**
Real-time server telemetry engine in the Super Admin dashboard. Displays accurate Linux distribution detection via `/etc/os-release`, physical CPU cores, real CPU model names, host disk storage metrics (`diskTotal`, `diskFree`, usage progress bar), physical RAM utilization, process PID, and server IP address.

### **I — Incident & Service Request Lifecycle**
Sequential ticket tracking (`ITL-000101`), severity classification (Urgent, High, Medium, Low), multi-stage statuses (`Open`, `In Progress`, `Waiting User`, `Resolved`, `Closed`), and visual badges indicating when a requester has replied.

### **J — Journal & Security Audit Trail**
Comprehensive, tamper-resistant audit logging capturing all critical activities: ticket status changes, ownership reassignment, configuration changes, user privilege elevation, and gateway credential modifications with actor IDs and timestamps.

### **K — Knowledge Base & Self-Service Deflection**
Searchable operational articles with category filtering. Empowers users to troubleshoot common workplace issues (VPN setup, Wi-Fi onboarding, password resets) without opening tickets.

### **L — Labor Time Tracking & Worklogs**
Technicians can record labor hours and minutes spent on each ticket alongside troubleshooting notes, providing operational accountability and resource tracking.

### **M — Multi-Role Access Control (RBAC)**
Strict server-enforced role hierarchy supporting 7 dedicated personas: Superadmin, Org Administrator, Team Manager, IT Technician / Agent, Inventory Manager, Requester / End-User, and Compliance Auditor.

### **N — Notification Engine & Live Indicators**
Real-time counter badges in the navigation bar alerting technicians to newly submitted tickets and follow-up replies without requiring manual browser page refreshes.

### **O — Organization Multi-Tenancy**
Architected with tenant isolation allowing multiple departments or subsidiary companies to coexist securely within a single deployed instance.

### **P — Public vs. Internal Confidential Notes**
Strict, dual-stream commenting architecture. Technicians can converse with requesters via Public Replies, or collaborate internally with private technician notes (`isInternal: true`) that are strictly excluded from end-user APIs and outgoing emails.

### **Q — Quick Persona Switcher**
Built-in developer and demonstration switcher in the top navigation allowing administrators to instantly preview and test workflows from any user persona.

### **R — Resolution Validation Gates & Auto-Reopening**
Enforces operational discipline by requiring mandatory root-cause resolution categories and closure notes before a ticket can be resolved. Reopening logic automatically shifts tickets from `Resolved` back to `Open` when an end-user sends a follow-up reply.

### **S — SLA Policies & Escalation Clocks**
Enterprise Service Level Agreement engine supporting severity-based First Response and Resolution time limits, business-hours calculation, visual countdowns, SLA breach warnings, and automatic manager escalation.

### **T — Task Checklists & Subtasks**
Interactive checklist manager inside every ticket. Break complex troubleshooting workflows into verifiable steps with completion timestamps.

### **U — Ubuntu Zero-Data-Loss Deployment**
Includes production bash deployment and upgrade scripts (`install-ubuntu.sh`, `update.sh`) designed to deploy the system, install dependencies, configure reverse proxies, and preserve live databases during updates.

### **V — Valuation & Multi-Currency CMDB**
Asset financial accounting module supporting Indian Rupee (₹ default), US Dollar ($), Euro (€), and British Pound (£) with automated aggregate hardware valuation summaries.

### **W — WebSockets & Live Reverse Proxy**
Integrated Nginx reverse proxy configuration supporting WebSocket upgrades, 50MB upload limits for large log/screenshot attachments, and long-polling stability.

### **X — X.509 Let's Encrypt SSL/TLS Integration**
Built-in deployment guide with automated Certbot execution commands for instant HTTPS encryption with automated 90-day certificate renewals.

### **Y — Yield & SLA Performance Analytics**
Executive reporting dashboard computing First-Contact Resolution (FCR) rate, mean time to resolve (MTTR), SLA compliance percentages, and individual agent workloads.

### **Z — Zero-Telemetry & Privacy Hardened**
No third-party trackers, external advertising cookies, or phone-home telemetry. All customer operational data remains strictly inside your server.

---

## 👥 Role-Based Access Control (RBAC) Matrix

| Feature / Module | Superadmin | Org Admin | Team Manager | Technician | Inventory Mgr | Requester | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **All-Tenants Super Console** | ✅ Full | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **System Engine Diagnostics** | ✅ Full | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Email Gateway Setup (IMAP/SMTP)**| ✅ Full | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **SLA Policies & Automation Rules**| ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No | ❌ No | 👁 View |
| **View All Organization Tickets** | ✅ Full | ✅ Full | 👥 Team Only | ✅ Full | ❌ No | 👤 Own Only | 👁 View |
| **Internal Technician Notes** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ No | 🚫 Hidden | 👁 View |
| **Close & Resolve Tickets** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| **CMDB Asset Management** | ✅ Full | ✅ Full | ❌ No | 👁 View | ✅ Full | ❌ No | 👁 View |
| **Asset Purchase Costs & Financials**| ✅ Full | ✅ Full | 🚫 Hidden | 🚫 Hidden | ✅ Full | 🚫 Hidden | 👁 View |
| **Service Catalog Requesting** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ No |
| **Security Audit Trail** | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No | ❌ No | 👁 View |

---

## 🎭 Default Personas & Testing Switcher

The system initializes with foundational accounts for instant demonstration and testing across every organizational tier:

| Persona Role | User Name | Employee ID | Email Address |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | Lakhan Prajapati | `CBPL2045` | `admin@lakhanglobal.com` |
| **Service Desk Technician** | Support Technician | `TECH1001` | `technician@lakhanglobal.com` |
| **Inventory & CMDB Manager** | Inventory Manager | `INV1001` | `inventory.manager@lakhanglobal.com` |
| **Operations Team Manager** | Team Manager | `MGR1001` | `team.manager@lakhanglobal.com` |
| **Compliance Auditor** | Compliance Auditor | `AUD1001` | `auditor@lakhanglobal.com` |

*Password for local testing:* `L@khan@123`

---

## 🌐 Live Custom Domain Hosting & Production Setup

To host the helpdesk on a live public domain (e.g., `helpdesk.lakhanglobal.com`) on an **Ubuntu 22.04 LTS** or **Debian 12** server:

### Step 1: DNS Setup
In your domain registrar (Cloudflare, GoDaddy, Namecheap), add an **A Record**:
* **Type:** `A`
* **Name / Subdomain:** `helpdesk`
* **Value:** `<YOUR_SERVER_PUBLIC_IP>`
* **TTL:** `300` (or Auto)

### Step 2: Configure UFW Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### Step 3: Configure 24/7 Systemd Service
Create `/etc/systemd/system/it-helpdesk.service`:
```ini
[Unit]
Description=IT Helpdesk & ITSM Portal (by Lakhan Prajapati)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/helpdesk
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now it-helpdesk
```

### Step 4: Configure Nginx Reverse Proxy with WebSockets
Create `/etc/nginx/sites-available/helpdesk.lakhanglobal.com.conf`:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name helpdesk.lakhanglobal.com;

    # 50MB maximum upload for screenshots, logs, and zip archives
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```
Enable the site and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/helpdesk.lakhanglobal.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 5: Install Free Automated Let's Encrypt SSL/TLS Certificate
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d helpdesk.lakhanglobal.com --non-interactive --agree-tos -m lakhan.prajapati2024@gmail.com --redirect
```

---

## 📧 Email Gateway & Auto-Ingestion Setup

The IT Helpdesk includes a centralized email gateway configured directly from the **Super Admin Console**:

1. **Inbound Polling (IMAP / POP3):**
   * Automatically polls your mailbox every 60 seconds (or on-demand).
   * Extracts requester details, subject, body, and attachments.
   * Checks for existing ticket IDs (`[ITL-XXXXXX]`) in the subject line to thread replies into the active ticket history.
   * If the ticket was previously marked `Resolved`, a new requester reply automatically reopens the ticket to `Open`.
2. **Outbound Dispatch (SMTP):**
   * Dispatches instant confirmation emails to requesters with ticket tracking numbers.
   * Sends technician notification alerts when tickets are assigned.
   * Sends notification emails upon ticket resolution requesting a CSAT survey rating.
3. **Anti-Loop & Deduplication Protection:**
   * Automatically suppresses automated bounces (`mailer-daemon`, `postmaster`).
   * Tracks processed `Message-ID` headers to prevent message flooding and duplicate ticket creation.

---

## 🐳 Docker & Containerized Deployment

Run the complete stack inside isolated Docker containers:

```bash
# Clone the repository
git clone https://github.com/lakhan-prajapati/it-helpdesk.git
cd it-helpdesk

# Start container with persistent volume storage
docker compose up -d --build

# Inspect container status
docker compose ps

# Follow container execution logs
docker compose logs -f
```

---

## 🔌 REST API Reference

All backend API routes return structured JSON responses and are prefixed with `/api`.

### Session & Roles
* `GET /api/session` — Retrieve active user session and tenant details.
* `POST /api/session/switch` — Switch active persona (`{ "userId": "usr-technician" }`).
* `GET /api/users` — List all organization users.
* `POST /api/users` — Create or invite a new user account.

### Tickets
* `GET /api/tickets` — Query tickets with queue, status, priority, and category filters.
* `GET /api/tickets/:id` — Single ticket details with comment streams, tasks, and audit log.
* `POST /api/tickets` — Create a new ticket with automatic SLA clock calculation.
* `PATCH /api/tickets/:id` — Update ticket status, priority, assignee, or resolution codes.
* `POST /api/tickets/:id/comments` — Append public replies (`isInternal: false`) or private notes (`isInternal: true`).
* `POST /api/tickets/:id/tasks` — Add or toggle checklist subtasks.
* `POST /api/tickets/:id/worklogs` — Record labor time in minutes.

### CMDB & Assets
* `GET /api/assets` — Query hardware devices and software licenses.
* `POST /api/assets` — Register a new asset into CMDB with serial and valuation details.
* `PATCH /api/assets/:id` — Update asset lifecycle status (`in_service`, `in_repair`, `retired`).

### System Diagnostics
* `GET /api/system/status` — Live telemetry endpoint reporting CPU, RAM, Disk Storage, OS distro, and license data.

---

## 🧪 Automated Test Suite & Quality Assurance

The application includes an extensive test suite verifying business logic, security guards, email parsing, and role isolation:

```bash
# Execute the full automated test suite
npm run test
```

**Verification Results: 92 passed, 0 failed**
* ✅ Fresh installation clean state verification (0 tickets, 0 assets).
* ✅ RBAC privilege enforcement across all 7 user roles.
* ✅ Team Manager privacy boundaries (cannot view other teams' tickets or asset financial costs).
* ✅ Public vs. Internal note strict separation.
* ✅ SLA clock calculation and pausing on `Waiting User` status.
* ✅ Email deduplication and message-ID loop protection.
* ✅ Reopening resolved tickets on follow-up requester email reply.
* ✅ Automated attachment extraction from inbound emails.
* ✅ Clean raw-hosting data sanitization.

---

## 💾 Disaster Recovery & Atomic Data Layer

The system uses an atomic, transaction-safe JSON database engine located at `/data/database.json`:
* **Atomic Writes:** Written using temporary staging files and atomic filesystem replacement (`fs.renameSync`), eliminating corrupted records during unexpected power failure.
* **Instant Backups:** Backup the entire database at any moment with a single command:
  ```bash
  cp data/database.json backups/database_$(date +%Y%m%d_%H%M%S).json
  ```
* **Instant Restore:** Replace `/data/database.json` with any historical snapshot and restart the service.

---

## 📄 Author & License

### Author
* **Lakhan Prajapati**
* Email: [lakhan.prajapati2024@gmail.com](mailto:lakhan.prajapati2024@gmail.com)

### License
This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See the full [LICENSE](./LICENSE) file for complete details.

---
<p align="center">
  <strong>Enterprise IT Helpdesk & Service Management System</strong><br />
  Copyright © 2026 Lakhan Prajapati. All Rights Reserved.
</p>
