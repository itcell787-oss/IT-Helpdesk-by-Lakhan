export type UserRole = 'superadmin' | 'admin' | 'manager' | 'technician' | 'requester' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  avatar?: string;
  organizationId: string;
  departmentId?: string;
  locationId?: string;
  phone?: string;
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended';
  branding: {
    logoUrl?: string;
    productName: string;
    supportEmail: string;
    primaryColor: string;
    secondaryColor: string;
    portalTitle: string;
    portalWelcome: string;
    footerText: string;
  };
  storageUsedMb: number;
  ticketCount: number;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  organizationId: string;
  managerId?: string;
}

export interface Location {
  id: string;
  name: string;
  organizationId: string;
  address?: string;
}

export interface Team {
  id: string;
  name: string;
  organizationId: string;
  leaderId?: string;
  members: string[]; // user IDs
  color?: string;
}

export type TicketStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'pending_requester'
  | 'pending_third_party'
  | 'waiting_approval'
  | 'on_hold'
  | 'resolved'
  | 'closed'
  | 'cancelled';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export type TicketType = 'incident' | 'service_request' | 'problem' | 'change';

export type SlaStatus = 'within_target' | 'warning' | 'breached' | 'paused';

export interface Ticket {
  id: string; // e.g. "ITL-000101"
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  category: string;
  subcategory?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  channel: 'portal' | 'email' | 'agent' | 'service_catalog' | 'api';
  
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  
  organizationId: string;
  departmentId?: string;
  locationId?: string;
  
  assignedTeamId?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  
  followers: string[];
  ccRecipients: string[];
  
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  dueDate?: string;
  resolvedAt?: string;
  closedAt?: string;
  
  resolutionCode?: 'solved' | 'workaround' | 'hardware_replaced' | 'vendor_fixed' | 'not_reproducible' | 'cancelled';
  resolutionSummary?: string;
  
  relatedAssetIds: string[];
  tags: string[];
  
  estimatedMinutes: number;
  actualMinutesSpent: number;
  
  customFields: Record<string, any>;
  
  slaStatus: SlaStatus;
  slaFirstResponseDeadline: string;
  slaResolutionDeadline: string;
  slaBreachReason?: string;
  
  linkedTicketIds?: string[];
  parentTicketId?: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  authorAvatar?: string;
  isInternal: boolean; // CRITICAL: true = confidential agent note, false = public reply to requester
  content: string;
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  emailMessageId?: string;
}

export interface MailboxConnectionConfig {
  userId: string;
  userEmail: string;
  incomingProtocol: 'imap' | 'pop3';
  incomingHost: string;
  incomingPort: number;
  incomingSecurity: 'ssl' | 'starttls' | 'none';
  incomingUsername: string;
  incomingPassword?: string;
  outgoingProtocol: 'smtp';
  outgoingHost: string;
  outgoingPort: number;
  outgoingSecurity: 'ssl' | 'starttls' | 'none';
  outgoingUsername: string;
  outgoingPassword?: string;
  fromName: string;
  fromEmail: string;
  status: 'connected' | 'error' | 'disconnected';
  lastTestedAt?: string;
  errorMessage?: string;
}

export interface DefaultEmailGatewayConfig {
  incomingProtocol: 'imap' | 'pop3';
  incomingHost: string;
  incomingPort: number;
  incomingSecurity: 'ssl' | 'starttls' | 'none';
  incomingUsername: string;
  incomingPassword?: string;
  outgoingProtocol: 'smtp';
  outgoingHost: string;
  outgoingPort: number;
  outgoingSecurity: 'ssl' | 'starttls' | 'none';
  outgoingUsername: string;
  outgoingPassword?: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  subjectPrefix: string;
  status: 'connected' | 'error' | 'configured';
  lastTestedAt?: string;
}

export interface OtpVerificationRecord {
  email: string;
  otp: string;
  expiresAt: number;
  verified: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'user' | 'asset';
  options?: string[];
  required: boolean;
  requiredOnClose: boolean;
  visibleOnPortal: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  order?: number;
  enabled?: boolean;
  section?: 'general' | 'technical' | 'environment' | 'closure';
  conditionalRule?: {
    dependsOnField: string;
    operator: 'equals' | 'not_equals';
    value: any;
  };
}

export interface SlaPolicy {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
  isDefault: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  enabled: boolean;
  order: number;
  trigger: 'ticket_created' | 'ticket_updated' | 'status_changed' | 'priority_changed';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'is_empty' | 'not_equals';
    value: string;
  }>;
  actions: Array<{
    type: 'assign_technician' | 'assign_team' | 'set_priority' | 'set_status' | 'add_internal_note' | 'add_tag';
    value: string;
  }>;
  executionCount: number;
  lastExecutedAt?: string;
}

export interface Asset {
  id: string; // e.g. "AST-1042"
  name: string;
  type: 'laptop' | 'desktop' | 'server' | 'monitor' | 'switch' | 'license' | 'mobile' | 'peripheral';
  manufacturer: string;
  model: string;
  serialNumber: string;
  hostname?: string;
  ipAddress?: string;
  macAddress?: string;
  os?: string;
  lifecycleStatus: 'in_service' | 'in_stock' | 'in_repair' | 'retired';
  assignedUserId?: string;
  assignedUserName?: string;
  organizationId: string;
  departmentId?: string;
  locationId?: string;
  purchaseDate: string;
  warrantyExpiry: string;
  purchaseCost?: number;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  isPublic: boolean; // true = visible to portal requesters, false = internal only
  status: 'published' | 'draft' | 'review';
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCatalogItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  estimatedHours: number;
  requiresApproval: boolean;
  approverRole?: 'manager' | 'it_lead' | 'finance';
  defaultTeamId?: string;
  defaultPriority: TicketPriority;
  fields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'select' | 'textarea' | 'checkbox';
    required: boolean;
    options?: string[];
  }>;
}

export interface ApprovalRequest {
  id: string;
  ticketId: string;
  catalogItemId: string;
  catalogItemTitle: string;
  requesterId: string;
  requesterName: string;
  approverId?: string;
  approverName?: string;
  approverRole: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface WorkLog {
  id: string;
  ticketId: string;
  technicianId: string;
  technicianName: string;
  minutes: number;
  date: string;
  billable: boolean;
  notes: string;
}

export interface TaskItem {
  id: string;
  ticketId: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  assignedTo?: string;
}

export interface EmailChannel {
  id: string;
  name: string;
  emailAddress: string;
  organizationId: string;
  provider: 'm365' | 'imap_smtp' | 'gmail' | 'generic';
  incomingHost: string;
  outgoingHost: string;
  status: 'connected' | 'error' | 'syncing';
  lastPolledAt?: string;
  queueDepth: number;
  totalProcessed: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'ticket' | 'user' | 'asset' | 'setting' | 'automation' | 'auth';
  entityId: string;
  details: string;
}

export interface SatisfactionSurvey {
  id: string;
  ticketId: string;
  requesterId: string;
  requesterName: string;
  rating: number; // 1-5 stars
  comment?: string;
  submittedAt: string;
}
