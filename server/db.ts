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
      currentUserId: 'usr-lakhan-super', // Default session
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
