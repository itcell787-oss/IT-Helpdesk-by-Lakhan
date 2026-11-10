import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Organization,
  User,
  Department,
  Location,
  Team,
  Ticket,
  TicketComment,
  CustomFieldDefinition,
  SlaPolicy,
  AutomationRule,
  Asset,
  KnowledgeArticle,
  ServiceCatalogItem,
  ApprovalRequest,
  WorkLog,
  TaskItem,
  EmailChannel,
  AuditLog,
  SatisfactionSurvey,
  MailboxConnectionConfig,
  DefaultEmailGatewayConfig,
  OtpVerificationRecord,
} from '../src/types';

import {
  initialOrganizations,
  initialDepartments,
  initialLocations,
  initialTeams,
  initialUsers,
  initialCustomFields,
  initialSlaPolicies,
  initialTickets,
  initialComments,
  initialAssets,
  initialKnowledgeArticles,
  initialServiceCatalog,
  initialApprovalRequests,
  initialWorkLogs,
  initialTasks,
  initialAutomationRules,
  initialEmailChannels,
  initialAuditLogs,
  initialSurveys,
} from '../src/data/initialData';

export interface DatabaseSchema {
  organizations: Organization[];
  departments: Department[];
  locations: Location[];
  teams: Team[];
  users: User[];
  customFields: CustomFieldDefinition[];
  slaPolicies: SlaPolicy[];
  tickets: Ticket[];
  comments: TicketComment[];
  assets: Asset[];
  knowledgeArticles: KnowledgeArticle[];
  serviceCatalog: ServiceCatalogItem[];
  approvalRequests: ApprovalRequest[];
  workLogs: WorkLog[];
  tasks: TaskItem[];
  automationRules: AutomationRule[];
  emailChannels: EmailChannel[];
  auditLogs: AuditLog[];
  surveys: SatisfactionSurvey[];
  adminMailboxes: MailboxConnectionConfig[];
  defaultGatewayConfig: DefaultEmailGatewayConfig;
  otpRecords: OtpVerificationRecord[];
  currentUserId: string;
  nextTicketSequence: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const APP_ROOT = path.resolve(__dirname, '..');
export const BACKUP_DIR = path.join(APP_ROOT, 'backups');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(APP_ROOT, 'data');
export const DB_FILE = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(DATA_DIR, 'database.json');
export const DB_SEED_FILE = path.join(DATA_DIR, 'database.seed.json');

export interface BackupMetadata {
  filename: string;
  filepath: string;
  sizeBytes: number;
  createdAt: string;
  ticketsCount: number;
  usersCount: number;
  assetsCount: number;
}

class DatabaseEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    const targetDir = path.dirname(DB_FILE);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Prefer pristine seed file if destination DB does not exist
    if (!fs.existsSync(DB_FILE) && fs.existsSync(DB_SEED_FILE)) {
      try {
        fs.copyFileSync(DB_SEED_FILE, DB_FILE);
      } catch (e) {
        console.warn('Could not copy initial seed database:', e);
      }
    }

    // Secondary fallback search if destination DB still does not exist
    if (!fs.existsSync(DB_FILE)) {
      const fallbackPaths = [
        path.join(APP_ROOT, 'data', 'database.json'),
        '/opt/it-helpdesk/data/database.json',
      ];
      for (const fb of fallbackPaths) {
        if (fs.existsSync(fb) && fs.statSync(fb).size > 1000) {
          try {
            console.log(`[Database Engine] Discovered existing live database at ${fb}. Restoring to ${DB_FILE}`);
            fs.copyFileSync(fb, DB_FILE);
            break;
          } catch {}
        }
      }
    }

    const initialAdminMailboxes: MailboxConnectionConfig[] = [
      {
        userId: 'usr-superadmin',
        userEmail: 'admin@lakhanglobal.com',
        incomingProtocol: 'imap',
        incomingHost: 'imap.lakhanglobal.com',
        incomingPort: 993,
        incomingSecurity: 'ssl',
        incomingUsername: 'admin@lakhanglobal.com',
        outgoingProtocol: 'smtp',
        outgoingHost: 'smtp.lakhanglobal.com',
        outgoingPort: 587,
        outgoingSecurity: 'starttls',
        outgoingUsername: 'admin@lakhanglobal.com',
        fromName: 'Lakhan Prajapati (Superadmin)',
        fromEmail: 'admin@lakhanglobal.com',
        status: 'connected',
        lastTestedAt: '2026-10-03T18:00:00Z',
      },
    ];

    const initialDefaultGateway: DefaultEmailGatewayConfig = {
      serviceProvider: 'self_hosted_imap',
      incomingProtocol: 'imap',
      incomingHost: '',
      incomingPort: 993,
      incomingSecurity: 'ssl',
      incomingUsername: '',
      outgoingProtocol: 'smtp',
      outgoingHost: '',
      outgoingPort: 587,
      outgoingSecurity: 'starttls',
      outgoingUsername: '',
      fromName: 'IT Helpdesk Support',
      fromEmail: '',
      replyToEmail: '',
      subjectPrefix: '[ITL-{{ticketId}}]',
      status: 'disconnected',
      lastPollStatus: 'Not configured. Enter email credentials in Settings > Helpdesk Email Gateway to connect.',
      enableInboundTicketGeneration: true,
      enableOutboundReplyNotification: true,
      pollingIntervalMinutes: 1,
      processedMessageIds: [],
      processedUids: [],
      processedFingerprints: [],
    };

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.adminMailboxes) parsed.adminMailboxes = initialAdminMailboxes;
        if (!parsed.defaultGatewayConfig) {
          parsed.defaultGatewayConfig = initialDefaultGateway;
        } else {
          if (parsed.defaultGatewayConfig.fromEmail?.includes('confiancebizsol')) {
            parsed.defaultGatewayConfig.fromEmail = '';
            parsed.defaultGatewayConfig.status = 'disconnected';
            parsed.defaultGatewayConfig.lastPollStatus = 'Not configured. Enter email credentials in Settings > Helpdesk Email Gateway to connect.';
          }
          if (parsed.defaultGatewayConfig.incomingHost?.includes('confiancebizsol')) {
            parsed.defaultGatewayConfig.incomingHost = '';
          }
          if (parsed.defaultGatewayConfig.outgoingHost?.includes('confiancebizsol')) {
            parsed.defaultGatewayConfig.outgoingHost = '';
          }
          if (parsed.defaultGatewayConfig.incomingUsername?.includes('confiancebizsol')) {
            parsed.defaultGatewayConfig.incomingUsername = '';
          }
          if (parsed.defaultGatewayConfig.outgoingUsername?.includes('confiancebizsol')) {
            parsed.defaultGatewayConfig.outgoingUsername = '';
          }
          if (parsed.defaultGatewayConfig.replyToEmail?.includes('confiancebizsol')) {
            parsed.defaultGatewayConfig.replyToEmail = '';
          }
          if (!parsed.defaultGatewayConfig.incomingHost) {
            parsed.defaultGatewayConfig.incomingHost = '';
          }
          if (!parsed.defaultGatewayConfig.outgoingHost) {
            parsed.defaultGatewayConfig.outgoingHost = '';
          }
          if (!parsed.defaultGatewayConfig.incomingUsername && parsed.defaultGatewayConfig.fromEmail) {
            parsed.defaultGatewayConfig.incomingUsername = parsed.defaultGatewayConfig.fromEmail;
          }
          if (!parsed.defaultGatewayConfig.outgoingUsername && parsed.defaultGatewayConfig.fromEmail) {
            parsed.defaultGatewayConfig.outgoingUsername = parsed.defaultGatewayConfig.fromEmail;
          }
          if (parsed.defaultGatewayConfig.enableInboundTicketGeneration === undefined) {
            parsed.defaultGatewayConfig.enableInboundTicketGeneration = true;
          }
          if (parsed.defaultGatewayConfig.enableOutboundReplyNotification === undefined) {
            parsed.defaultGatewayConfig.enableOutboundReplyNotification = true;
          }
          if (parsed.defaultGatewayConfig.pollingIntervalMinutes === undefined) {
            parsed.defaultGatewayConfig.pollingIntervalMinutes = 1;
          }
          if (!parsed.defaultGatewayConfig.status) {
            parsed.defaultGatewayConfig.status = parsed.defaultGatewayConfig.fromEmail ? 'connected' : 'disconnected';
          }
          if (!parsed.defaultGatewayConfig.processedMessageIds) {
            parsed.defaultGatewayConfig.processedMessageIds = [];
          }
          if (!parsed.defaultGatewayConfig.processedUids) {
            parsed.defaultGatewayConfig.processedUids = [];
          }
          if (!parsed.defaultGatewayConfig.processedFingerprints) {
            parsed.defaultGatewayConfig.processedFingerprints = [];
          }
        }
        if (!parsed.otpRecords) parsed.otpRecords = [];
        
        // Ensure organizations have systemSettings and preSharedKey
        if (parsed.organizations) {
          parsed.organizations = parsed.organizations.map((org: any) => {
            if (!org.systemSettings) {
              org.systemSettings = {
                requireOtpForTicketSubmission: false,
                enableTicketRating: true,
                enableCategoryAutoAssign: true,
                preSharedKey: 'Sports@9433',
                categoryAutoAssignRules: {
                  'Hardware & Workstations': { technicianId: 'usr-technician', technicianName: 'Support Technician', teamId: 'team-l1-helpdesk' },
                  'Software & Cloud Apps': { technicianId: 'usr-technician', technicianName: 'Support Technician', teamId: 'team-l1-helpdesk' },
                  'Network & VPN': { technicianId: 'usr-technician', technicianName: 'Support Technician', teamId: 'team-l1-helpdesk' },
                  'Cybersecurity & Access': { technicianId: 'usr-technician', technicianName: 'Support Technician', teamId: 'team-l1-helpdesk' },
                  'Email & Collaboration': { technicianId: 'usr-technician', technicianName: 'Support Technician', teamId: 'team-l1-helpdesk' },
                },
              };
            } else if (!org.systemSettings.preSharedKey) {
              org.systemSettings.preSharedKey = 'Sports@9433';
            }
            if (!org.systemSettings.defaultCurrency || org.systemSettings.defaultCurrency === '$') {
              org.systemSettings.defaultCurrency = '₹';
            }
            if (org.systemSettings.allowRequesterAssetSelfService === undefined) {
              org.systemSettings.allowRequesterAssetSelfService = true;
            }
            if (!org.systemSettings.ticketCategories || !Array.isArray(org.systemSettings.ticketCategories) || org.systemSettings.ticketCategories.length === 0) {
              org.systemSettings.ticketCategories = [
                'Hardware & Workstations',
                'Software & Cloud Apps',
                'Network & Connectivity',
                'Security & Access',
                'User Accounts & Permissions',
                'AV & Conference Rooms'
              ];
            }
            return org;
          });
        }

        // Default guest session so visitors see guest portal by default
        parsed.currentUserId = '';

        // Ensure users have passwords, username, and default privileges
        if (parsed.users) {
          parsed.users = parsed.users
            .map((u: any) => {
              if (u.role === 'superadmin' || u.id === 'usr-superadmin') {
                u.name = 'Lakhan Prajapati';
                u.username = 'admin';
                u.email = 'admin@lakhanglobal.com';
                u.employeeCode = 'CBPL2045';
                if (!u.title) {
                  u.title = 'Super Administrator & Global Head of IT';
                }
                if (!u.password || u.password === 'Sports@9433' || u.password === 'Admin@123' || u.password === 'Lakhan@Production2026!') {
                  u.password = 'L@khan@123';
                  u.mustChangePassword = true;
                }
              } else if (!u.password) {
                u.password = (u.role === 'admin') ? 'Admin@123' : (u.role === 'requester' ? 'User@123' : 'Tech@123');
              }
              if (!u.privileges && (u.role === 'superadmin' || u.role === 'admin' || u.role === 'manager' || u.role === 'technician')) {
                u.privileges = {
                  canManageTickets: true,
                  canDeleteTickets: u.role === 'superadmin' || u.role === 'admin',
                  canManageAssets: true,
                  canManageKnowledgeBase: u.role !== 'technician',
                  canManageApprovals: u.role !== 'technician',
                };
              }
              return u;
            })
            .filter((u: any) => !u.email?.includes('confiancebizsol'));
        }

        if (parsed.tickets) {
          parsed.tickets = parsed.tickets.filter((t: any) => !t.requesterEmail?.includes('confiancebizsol'));
        }
        if (parsed.comments) {
          parsed.comments = parsed.comments.filter((c: any) => !c.authorEmail?.includes('confiancebizsol') && !c.emailRecipient?.includes('confiancebizsol'));
        }
        if (parsed.auditLogs) {
          parsed.auditLogs = parsed.auditLogs.filter((a: any) => !a.details?.includes('confiancebizsol'));
        }

        // Ensure active open tickets have active deadlines for live ticking timer
        if (parsed.tickets) {
          const nowMs = Date.now();
          parsed.tickets = parsed.tickets.map((t: any) => {
            if (t.status !== 'resolved' && t.status !== 'closed' && t.status !== 'cancelled') {
              const resDeadline = new Date(t.slaResolutionDeadline).getTime();
              // If deadline is older than 2 hours in past, reset to dynamic active remaining time
              if (isNaN(resDeadline) || resDeadline < nowMs - 2 * 3600 * 1000) {
                const hoursMap: Record<string, number> = {
                  critical: 2.5,
                  urgent: 4.5,
                  high: 8,
                  normal: 20,
                  low: 40,
                };
                const addHours = hoursMap[t.priority] || 12;
                t.createdAt = new Date(nowMs - 45 * 60 * 1000).toISOString();
                t.slaFirstResponseDeadline = new Date(nowMs + 45 * 60 * 1000).toISOString();
                t.slaResolutionDeadline = new Date(nowMs + addHours * 3600 * 1000).toISOString();
                t.dueDate = t.slaResolutionDeadline;
                t.slaStatus = 'within_target';
              }
            }
            // Business Rule: Requesters cannot be assigned tickets
            if (t.assignedTechnicianId && parsed.users) {
              const tech = parsed.users.find((u: any) => u.id === t.assignedTechnicianId);
              if (tech && tech.role === 'requester') {
                t.assignedTechnicianId = undefined;
                t.assignedTechnicianName = undefined;
              }
            }
            if (t.assignedTechnicianName && parsed.users) {
              const tech = parsed.users.find((u: any) => u.name === t.assignedTechnicianName || t.assignedTechnicianName.includes(u.name));
              if (tech && tech.role === 'requester') {
                t.assignedTechnicianId = undefined;
                t.assignedTechnicianName = undefined;
              }
            }
            return t;
          });
        }

        // Auto-assign temporary employee ID and hierarchy linking for existing users if missing
        if (parsed.users && Array.isArray(parsed.users)) {
          parsed.users = parsed.users.map((u: any, idx: number) => {
            if (!u.employeeCode || !u.employeeCode.trim()) {
              if (u.id === 'usr-lakhan-super' || u.name?.toLowerCase().includes('lakhan')) {
                u.employeeCode = 'CBPL2045';
              } else {
                u.employeeCode = `CBPL${1000 + (idx + 1)}`;
              }
            }
            if (u.role === 'requester') {
              if (!u.managerId) {
                const defaultMgr = parsed.users.find((m: any) => m.role === 'manager') || parsed.users.find((m: any) => m.role === 'admin' || m.role === 'superadmin');
                u.managerId = defaultMgr?.id || 'usr-team-manager';
              }
              if (!u.groupId) {
                u.groupId = 'grp-operations';
                u.groupName = 'Operations Requester Group';
              }
            }
            return u;
          });
        }

        // Auto-assign location / desk number for existing assets if missing
        if (parsed.assets && Array.isArray(parsed.assets)) {
          const sampleDesks = [
            'Desk #14-B',
            'Desk A-102',
            'Sales Bay Desk 4',
            'Cabin 04',
            'Floor 3 - Desk 42',
            'IT Lab Rack-1',
            'Server Room Rack-2',
            'Desk B-204',
            'Engineering Pod 3',
            'Executive Suite 1'
          ];
          parsed.assets = parsed.assets.map((a: any, idx: number) => {
            if (!a.locationDesk) {
              a.locationDesk = sampleDesks[idx % sampleDesks.length];
            }
            return a;
          });
        }

        this.save(parsed);
        return parsed;
      } catch (err) {
        console.error('Failed reading database file, reseeding initial data:', err);
      }
    }

    const initialDb: DatabaseSchema = {
      organizations: initialOrganizations,
      departments: initialDepartments,
      locations: initialLocations,
      teams: initialTeams,
      users: initialUsers,
      customFields: initialCustomFields,
      slaPolicies: initialSlaPolicies,
      tickets: initialTickets,
      comments: initialComments,
      assets: initialAssets,
      knowledgeArticles: initialKnowledgeArticles,
      serviceCatalog: initialServiceCatalog,
      approvalRequests: initialApprovalRequests,
      workLogs: initialWorkLogs,
      tasks: initialTasks,
      automationRules: initialAutomationRules,
      emailChannels: initialEmailChannels,
      auditLogs: initialAuditLogs,
      surveys: initialSurveys,
      adminMailboxes: initialAdminMailboxes,
      defaultGatewayConfig: initialDefaultGateway,
      otpRecords: [],
      currentUserId: '', // By default: guest session (landing on End User Portal)
      nextTicketSequence: 110,
    };

    this.save(initialDb);
    return initialDb;
  }

  public save(dataToSave?: DatabaseSchema) {
    if (dataToSave) {
      this.data = dataToSave;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      const bakFile = `${DB_FILE}.bak`;
      const jsonContent = JSON.stringify(this.data, null, 2);

      // 1. Write to temporary file first
      fs.writeFileSync(tmpFile, jsonContent, 'utf-8');

      // 2. Keep a backup copy of previous valid database if it exists
      if (fs.existsSync(DB_FILE)) {
        try {
          fs.copyFileSync(DB_FILE, bakFile);
        } catch {}
      }

      // 3. Atomically rename temp file over destination (atomic on POSIX)
      fs.renameSync(tmpFile, DB_FILE);

      // 4. Keep persistent rolling backup in BACKUP_DIR
      try {
        if (!fs.existsSync(BACKUP_DIR)) {
          fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, 'latest_active_db.json'));
      } catch {}
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  public get<K extends keyof DatabaseSchema>(table: K): DatabaseSchema[K] {
    return this.data[table];
  }

  public set<K extends keyof DatabaseSchema>(table: K, value: DatabaseSchema[K]) {
    this.data[table] = value;
    this.save();
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public resetToDefault() {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    this.data = this.loadOrSeed();
  }

  public generateTicketId(): string {
    const seq = this.data.nextTicketSequence++;
    this.save();
    return `ITL-${seq.toString().padStart(6, '0')}`;
  }

  public createBackup(label?: string): string {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeLabel = label ? `_${label.replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
    const dest = path.join(BACKUP_DIR, `database_backup_${timestamp}${safeLabel}.json`);
    fs.copyFileSync(DB_FILE, dest);
    return dest;
  }

  public listBackups(): BackupMetadata[] {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    try {
      const files = fs.readdirSync(BACKUP_DIR);
      const results: BackupMetadata[] = [];
      for (const f of files) {
        if (f.endsWith('.json')) {
          const fullPath = path.join(BACKUP_DIR, f);
          try {
            const stat = fs.statSync(fullPath);
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            results.push({
              filename: f,
              filepath: fullPath,
              sizeBytes: stat.size,
              createdAt: stat.mtime.toISOString(),
              ticketsCount: Array.isArray(content.tickets) ? content.tickets.length : 0,
              usersCount: Array.isArray(content.users) ? content.users.length : 0,
              assetsCount: Array.isArray(content.assets) ? content.assets.length : 0,
            });
          } catch {}
        }
      }
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  public restoreFromBackup(filenameOrPath: string): boolean {
    const targetPath = path.isAbsolute(filenameOrPath)
      ? filenameOrPath
      : path.join(BACKUP_DIR, filenameOrPath);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Backup file not found at: ${targetPath}`);
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.tickets)) {
      throw new Error('Invalid database backup structure: missing users or tickets collection.');
    }

    // Save previous state to safety backup before overwriting
    this.createBackup('pre_restore_safety');

    this.data = parsed;
    this.save();
    return true;
  }

  public restoreFromRaw(jsonString: string): boolean {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.tickets)) {
      throw new Error('Invalid JSON structure. Ensure it is a valid IT Helpdesk database export.');
    }
    this.createBackup('pre_restore_safety');
    this.data = parsed;
    this.save();
    return true;
  }
}

export const db = new DatabaseEngine();
