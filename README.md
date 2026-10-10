# IT Helpdesk by Lakhan
### Modern IT Support, Service Desk and Ticket Management Platform

Enterprise-ready IT service desk, ticketing and support management platform built with modern ITSM principles, a configurable administration system, a liquid-glass UI with light & dark theme support, and a responsive end-user self-service portal.

---

## 1. System Overview & Architecture

**IT Helpdesk by Lakhan** delivers the core capabilities and familiar workflows of modern enterprise ITSM platforms (such as Spiceworks Cloud Help Desk and ServiceNow):

* **Full-Stack Architecture**: React 19 SPA with Tailwind CSS v4, Lucide icons, and an Express 4 REST API server mounted with Vite middleware in development and static asset serving in production.
* **Persistent Data Layer**: Server-side JSON database (`/data/database.json`) with atomic writes, transactions, foreign key mappings, and audit trail.
* **Strict RBAC & Tenant Scoping**: Built-in support for Superadmin, Organization Administrator, Helpdesk Manager, Technician / IT Agent, End User / Requester, and Auditor.
* **Liquid Glass Design System**: Glassmorphic translucent surfaces, subtle 1px border lines, dark & light themes, zero-pill metadata typography with `·` separators, and tabular figures for all numeric indicators (`tabular-nums`).
* **Complete Ticket Lifecycle**: Sequential numbering (`ITL-000101`), queues, public replies vs confidential internal notes, task checklists, labor work logging, SLA breach calculators, and closure validation gates.
* **CMDB IT Asset Management**: Workstation laptops, core switches, firewalls, cluster hosts, and software license tracking.
* **Service Catalog & Approvals**: Pre-configured IT request forms with multi-step manager/IT lead approval gates.
* **Email-to-Ticket Gateway**: Inbound mailbox connectors (Microsoft 365 Graph, IMAP/SMTP), email threading via `[ITL-XXXXXX]` subject matching, and interactive inbound simulator.
* **Self-Service Portal (`/portal`)**: Clean, accessible portal for requesters to submit requests, track progress, browse knowledge base articles, and submit post-resolution CSAT surveys.

---

## 2. Default Seed Accounts & Persona Switcher

The application includes an in-app persona impersonator in the top navigation bar to seamlessly test any role:

| Persona | Name | Role | Email | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Superadmin** | Lakhan Verma | `superadmin` | `lakhan.superadmin@ithelpdesk.com` | Platform Console & All Tenants |
| **Org Admin** | Sarah Jenkins | `admin` | `sarah.admin@lakhanglobal.com` | Organization Configuration & Workflows |
| **Helpdesk Manager** | Marcus Vance | `manager` | `marcus.manager@lakhanglobal.com` | Team Queues & Approvals |
| **Technician** | Alex Rivera | `technician` | `alex.tech@lakhanglobal.com` | Service Desk Tier 1 |
| **Technician** | Elena Rostova | `technician` | `elena.tech@lakhanglobal.com` | Workplace Hardware Logistics |
| **Requester** | David Miller | `requester` | `david.miller@lakhanglobal.com` | Self-Service Portal & My Tickets |
| **Requester** | Priya Sharma | `requester` | `priya.sharma@lakhanglobal.com` | Self-Service Portal & My Tickets |
| **Auditor** | Rachel Green | `auditor` | `rachel.auditor@lakhanglobal.com` | Read-only Audit Trail |

---

## 3. Quick Start & Installation

### Prerequisites
* Node.js 20.x or 22.x LTS
* npm 10.x+

### Local Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack dev server (Express + Vite on port 3000)
npm run dev

# 3. Run the automated test suite
npm run test

# 4. Check TypeScript types and lint
npm run lint

# 5. Production Build
npm run build
```

The application will be accessible at `http://localhost:3000`.

---

## 4. Docker Deployment

### Using Docker Compose
```bash
docker-compose up -d --build
```

### Standalone Docker Build
```bash
docker build -t it-helpdesk-lakhan .
docker run -d -p 3000:3000 -v helpdesk_data:/app/data --name it-helpdesk it-helpdesk-lakhan
```

---

## 5. REST API Documentation

All endpoints return JSON and are prefixed with `/api`.

### Session & Roles
* `GET /api/session`: Retrieve current active user persona and organization.
* `POST /api/session/switch`: Switch user persona (`{ "userId": "usr-alex-tech" }`).
* `GET /api/users`: List all system users.
* `POST /api/users`: Create/invite a new user.

### Tickets
* `GET /api/tickets`: Query tickets with filters (`queue`, `status`, `priority`, `category`, `search`, `assigneeId`).
* `GET /api/tickets/:id`: Single ticket with comments, subtasks, worklogs, and audit history.
* `POST /api/tickets`: Create ticket with SLA calculation and rule automation.
* `PATCH /api/tickets/:id`: Update status, priority, assignee, or resolution codes.
* `POST /api/tickets/:id/comments`: Add a public reply (`isInternal: false`) or confidential note (`isInternal: true`).
* `POST /api/tickets/:id/tasks`: Add or toggle tasklist items.
* `POST /api/tickets/:id/worklogs`: Record technician labor minutes.
* `POST /api/tickets/bulk`: Bulk update status, priority, or tags.

### Assets & CMDB
* `GET /api/assets`: List hardware, devices, and software licenses.
* `POST /api/assets`: Register a new asset into CMDB.
* `PATCH /api/assets/:id`: Update asset lifecycle status or assignment.

### Service Catalog & Approvals
* `GET /api/service-catalog`: List standard service items.
* `POST /api/service-catalog/request`: Submit catalog order (creates ticket and pending approval).
* `GET /api/approvals`: List pending approvals.
* `POST /api/approvals/:id/decide`: Approve or reject (`{ "status": "approved", "notes": "..." }`).

### Email Gateway
* `GET /api/email-channels`: List configured mailboxes.
* `POST /api/email/simulate-inbound`: Test inbound email parser & threading.

### Reports & Superadmin
* `GET /api/reports/metrics`: Computed SLA compliance rate, resolution velocity, and agent workload.
* `GET /api/superadmin/stats`: Tenant metrics, storage quotas, and system health.
* `GET /api/audit-logs`: Query security audit trail.

---

## 6. Backup, Restoration & Disaster Recovery

* **Database File**: The persistent database is located at `/data/database.json`.
* **Backup**: Run `cp /app/data/database.json /backup/database_$(date +%Y%m%d).json`.
* **Restoration**: Replace `/app/data/database.json` and restart the Node server.

---

## 7. Security & Compliance Checklist

* [x] **Confidential Notes Isolation**: Private notes are strictly excluded from outgoing requester emails and end-user portal APIs.
* [x] **Closure Gate Enforcement**: Resolution code is mandatory before tickets can transition to Resolved or Closed.
* [x] **Audit Trail**: High-impact operations (status changes, assignments, approvals, role switches) are logged with actor timestamps.
* [x] **Anti-Loop Email Protection**: Incoming email processing handles ticket threading via `[ITL-XXXXXX]` and suppresses email loops.
* [x] **WCAG 2.2 AA Contrast**: Complete contrast testing in both Light and Dark liquid-glass modes.
