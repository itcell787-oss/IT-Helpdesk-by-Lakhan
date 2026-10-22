import fs from 'fs';
import path from 'path';
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const initialAdminMailboxes: MailboxConnectionConfig[] = [
      {
        userId: 'usr-lakhan-super',
        userEmail: 'lakhan.superadmin@ithelpdesk.com',
        incomingProtocol: 'imap',
        incomingHost: 'imap.ithelpdesk.internal',
        incomingPort: 993,
        incomingSecurity: 'ssl',
        incomingUsername: 'lakhan.superadmin@ithelpdesk.com',
        outgoingProtocol: 'smtp',
        outgoingHost: 'smtp.ithelpdesk.internal',
        outgoingPort: 587,
        outgoingSecurity: 'starttls',
        outgoingUsername: 'lakhan.superadmin@ithelpdesk.com',
        fromName: 'Lakhan Verma (Superadmin)',
        fromEmail: 'lakhan.superadmin@ithelpdesk.com',
        status: 'connected',
        lastTestedAt: '2026-10-03T18:00:00Z',
      },
      {
        userId: 'usr-sarah-admin',
        userEmail: 'sarah.admin@lakhanglobal.com',
        incomingProtocol: 'pop3',
        incomingHost: 'pop.lakhanglobal.com',
        incomingPort: 995,
        incomingSecurity: 'ssl',
        incomingUsername: 'sarah.admin@lakhanglobal.com',
        outgoingProtocol: 'smtp',
        outgoingHost: 'smtp.lakhanglobal.com',
        outgoingPort: 587,
        outgoingSecurity: 'starttls',
        outgoingUsername: 'sarah.admin@lakhanglobal.com',
        fromName: 'Sarah Jenkins (IT Admin)',
        fromEmail: 'sarah.admin@lakhanglobal.com',
        status: 'connected',
        lastTestedAt: '2026-10-03T18:30:00Z',
      },
    ];

    const initialDefaultGateway: DefaultEmailGatewayConfig = {
      incomingProtocol: 'imap',
      incomingHost: 'imap.lakhanglobal.com',
      incomingPort: 993,
      incomingSecurity: 'ssl',
      incomingUsername: 'helpdesk@lakhanglobal.com',
      outgoingProtocol: 'smtp',
      outgoingHost: 'smtp.lakhanglobal.com',
      outgoingPort: 587,
      outgoingSecurity: 'starttls',
      outgoingUsername: 'helpdesk@lakhanglobal.com',
      fromName: 'IT Helpdesk Support',
      fromEmail: 'helpdesk@lakhanglobal.com',
      replyToEmail: 'helpdesk@lakhanglobal.com',
      subjectPrefix: '[ITL-{{ticketId}}]',
      status: 'connected',
      lastTestedAt: '2026-10-03T19:00:00Z',
    };

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.adminMailboxes) parsed.adminMailboxes = initialAdminMailboxes;
        if (!parsed.defaultGatewayConfig) parsed.defaultGatewayConfig = initialDefaultGateway;
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
                  'Hardware & Workstations': { technicianId: 'usr-elena-tech', technicianName: 'Elena Rostova', teamId: 'team-workplace' },
                  'Software & Cloud Apps': { technicianId: 'usr-alex-tech', technicianName: 'Alex Rivera', teamId: 'team-l1-helpdesk' },
                  'Network & VPN': { technicianId: 'usr-marcus-manager', technicianName: 'Marcus Vance', teamId: 'team-infra-net' },
                  'Cybersecurity & Access': { technicianId: 'usr-sarah-admin', technicianName: 'Sarah Jenkins', teamId: 'team-sec-ops' },
                  'Email & Collaboration': { technicianId: 'usr-alex-tech', technicianName: 'Alex Rivera', teamId: 'team-l1-helpdesk' },
                },
              };
            } else if (!org.systemSettings.preSharedKey) {
              org.systemSettings.preSharedKey = 'Sports@9433';
            }
            if (!org.systemSettings.defaultCurrency) {
              org.systemSettings.defaultCurrency = '₹';
            }
            if (org.systemSettings.allowRequesterAssetSelfService === undefined) {
              org.systemSettings.allowRequesterAssetSelfService = true;
            }
            return org;
          });
        }

        // Ensure users have passwords and default privileges
        if (parsed.users) {
          parsed.users = parsed.users.map((u: any) => {
            if (u.role === 'superadmin') {
              if (!u.password || u.password === 'Admin@123') {
                u.password = 'Sports@9433';
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
          });
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

        // Auto-assign temporary employee ID for existing users if missing
        if (parsed.users && Array.isArray(parsed.users)) {
          parsed.users = parsed.users.map((u: any, idx: number) => {
            if (!u.employeeCode || !u.employeeCode.trim()) {
              if (u.id === 'usr-lakhan-super' || u.name?.toLowerCase().includes('lakhan')) {
                u.employeeCode = 'CBPL2045';
              } else {
                u.employeeCode = `CBPL${1000 + (idx + 1)}`;
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
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
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
}

export const db = new DatabaseEngine();
