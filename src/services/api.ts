import {
  Ticket,
  TicketComment,
  User,
  Organization,
  Asset,
  KnowledgeArticle,
  ServiceCatalogItem,
  ApprovalRequest,
  WorkLog,
  TaskItem,
  CustomFieldDefinition,
  SlaPolicy,
  AutomationRule,
  EmailChannel,
  AuditLog,
  SatisfactionSurvey,
  MailboxConnectionConfig,
  DefaultEmailGatewayConfig,
  Team,
} from '../types';

function getSessionToken(): string {
  try {
    return localStorage.getItem('it_helpdesk_session_token') || '';
  } catch {
    return '';
  }
}

function getStoredUserId(): string {
  try {
    return localStorage.getItem('it_helpdesk_user_id') || '';
  } catch {
    return '';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getSessionToken();
  const userId = getStoredUserId();

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-session-token': token } : {}),
      ...(userId ? { 'x-user-id': userId } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Session & Auth (Isolated per client device / PC)
  async getSession(): Promise<{ user: User | null; organization: Organization; availableUsers: User[]; sessionToken?: string | null }> {
    const data = await request<{ user: User | null; organization: Organization; availableUsers: User[]; sessionToken?: string | null }>('/api/session');
    if (data.sessionToken) {
      try {
        localStorage.setItem('it_helpdesk_session_token', data.sessionToken);
        if (data.user?.id) {
          localStorage.setItem('it_helpdesk_user_id', data.user.id);
        }
      } catch {}
    } else if (!data.user) {
      try {
        localStorage.removeItem('it_helpdesk_session_token');
        localStorage.removeItem('it_helpdesk_user_id');
      } catch {}
    }
    return data;
  },

  async login(payload: { email: string; password?: string; portalType?: 'user' | 'admin' }): Promise<{ user: User; organization: Organization; sessionToken?: string }> {
    const data = await request<{ user: User; organization: Organization; sessionToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.sessionToken) {
      try {
        localStorage.setItem('it_helpdesk_session_token', data.sessionToken);
        localStorage.setItem('it_helpdesk_user_id', data.user.id);
      } catch {}
    }
    return data;
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      await request('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      try {
        localStorage.removeItem('it_helpdesk_session_token');
        localStorage.removeItem('it_helpdesk_user_id');
      } catch {}
    }
    return { success: true };
  },

  async switchUser(userId: string): Promise<{ user: User; organization: Organization; sessionToken?: string }> {
    const data = await request<{ user: User; organization: Organization; sessionToken?: string }>('/api/session/switch', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    if (data.sessionToken) {
      try {
        localStorage.setItem('it_helpdesk_session_token', data.sessionToken);
        localStorage.setItem('it_helpdesk_user_id', data.user.id);
      } catch {}
    }
    return data;
  },

  async getSystemStatus(): Promise<any> {
    return request('/api/system/status');
  },

  async updateUserPrivileges(userId: string, privileges: Partial<User['privileges']>): Promise<User> {
    return request(`/api/users/${userId}/privileges`, {
      method: 'PATCH',
      body: JSON.stringify(privileges),
    });
  },

  async getUsers(): Promise<User[]> {
    return request('/api/users');
  },

  async createUser(payload: Partial<User>): Promise<User> {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, payload: Partial<User>): Promise<User> {
    return request(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean; deletedUserId: string }> {
    return request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  async registerUser(payload: {
    name: string;
    email: string;
    employeeCode?: string;
    organizationId?: string;
    departmentId?: string;
    title?: string;
    phone?: string;
    otp?: string;
    preSharedKey?: string;
    password?: string;
  }): Promise<{ success: boolean; message: string; user: User }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Organizations
  async getOrganizations(): Promise<Organization[]> {
    return request('/api/organizations');
  },

  async createOrganization(payload: Partial<Organization>): Promise<Organization> {
    return request('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateOrganization(id: string, payload: Partial<Organization>): Promise<Organization> {
    return request(`/api/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteOrganization(id: string): Promise<{ success: boolean; deletedOrgId: string }> {
    return request(`/api/organizations/${id}`, {
      method: 'DELETE',
    });
  },

  // Tickets
  async getTickets(params?: Record<string, string>): Promise<Ticket[]> {
    const query = new URLSearchParams(params).toString();
    return request(`/api/tickets${query ? `?${query}` : ''}`);
  },

  async getTicket(id: string): Promise<{
    ticket: Ticket;
    comments: TicketComment[];
    tasks: TaskItem[];
    workLogs: WorkLog[];
    auditLogs: AuditLog[];
  }> {
    return request(`/api/tickets/${id}`);
  },

  async createTicket(payload: Partial<Ticket>): Promise<Ticket> {
    return request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTicket(id: string, payload: Partial<Ticket>): Promise<Ticket> {
    return request(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteTicket(id: string): Promise<{ success: boolean; deletedTicketId: string }> {
    return request(`/api/tickets/${id}`, {
      method: 'DELETE',
    });
  },

  async addComment(ticketId: string, content: string, isInternal: boolean = false, attachments: any[] = []): Promise<TicketComment> {
    return request(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, isInternal, attachments }),
    });
  },

  async addTask(ticketId: string, title: string): Promise<TaskItem> {
    return request(`/api/tickets/${ticketId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  async toggleTask(ticketId: string, taskId: string, completed: boolean): Promise<TaskItem> {
    return request(`/api/tickets/${ticketId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
  },

  async addWorkLog(ticketId: string, minutes: number, notes: string, billable: boolean = false, date?: string): Promise<WorkLog> {
    return request(`/api/tickets/${ticketId}/worklogs`, {
      method: 'POST',
      body: JSON.stringify({ minutes, notes, billable, date }),
    });
  },

  async bulkUpdateTickets(ticketIds: string[], action: string, value: string): Promise<{ success: boolean; updatedCount: number }> {
    return request('/api/tickets/bulk', {
      method: 'POST',
      body: JSON.stringify({ ticketIds, action, value }),
    });
  },

  // Assets
  async getAssets(): Promise<Asset[]> {
    return request('/api/assets');
  },

  async createAsset(payload: Partial<Asset>): Promise<Asset> {
    return request('/api/assets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAsset(id: string, payload: Partial<Asset>): Promise<Asset> {
    return request(`/api/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteAsset(id: string): Promise<{ success: boolean; deletedAssetId: string }> {
    return request(`/api/assets/${id}`, {
      method: 'DELETE',
    });
  },

  // Knowledge Base
  async getKnowledgeArticles(params?: { search?: string; category?: string; publicOnly?: boolean }): Promise<KnowledgeArticle[]> {
    const searchParams: Record<string, string> = {};
    if (params?.search) searchParams.search = params.search;
    if (params?.category) searchParams.category = params.category;
    if (params?.publicOnly) searchParams.publicOnly = 'true';
    const query = new URLSearchParams(searchParams).toString();
    return request(`/api/knowledge-base${query ? `?${query}` : ''}`);
  },

  async createKnowledgeArticle(payload: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
    return request('/api/knowledge-base', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateKnowledgeArticle(id: string, payload: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
    return request(`/api/knowledge-base/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteKnowledgeArticle(id: string): Promise<{ success: boolean; deletedArticleId: string }> {
    return request(`/api/knowledge-base/${id}`, {
      method: 'DELETE',
    });
  },

  async voteArticle(id: string, helpful: boolean): Promise<KnowledgeArticle> {
    return request(`/api/knowledge-base/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    });
  },

  // Service Catalog & Approvals
  async getServiceCatalog(): Promise<ServiceCatalogItem[]> {
    return request('/api/service-catalog');
  },

  async createCatalogItem(payload: Partial<ServiceCatalogItem>): Promise<ServiceCatalogItem> {
    return request('/api/service-catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCatalogItem(id: string, payload: Partial<ServiceCatalogItem>): Promise<ServiceCatalogItem> {
    return request(`/api/service-catalog/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteCatalogItem(id: string): Promise<{ success: boolean; deletedCatalogId: string }> {
    return request(`/api/service-catalog/${id}`, {
      method: 'DELETE',
    });
  },

  async requestCatalogItem(
    catalogItemId: string,
    formData: Record<string, any>,
    requesterDetails?: {
      requesterId?: string;
      requesterName?: string;
      requesterEmail?: string;
      requesterEmployeeCode?: string;
    }
  ): Promise<{ ticket: Ticket }> {
    return request('/api/service-catalog/request', {
      method: 'POST',
      body: JSON.stringify({ catalogItemId, formData, ...requesterDetails }),
    });
  },

  async getApprovals(): Promise<ApprovalRequest[]> {
    return request('/api/approvals');
  },

  async decideApproval(id: string, status: 'approved' | 'rejected', notes?: string): Promise<ApprovalRequest> {
    return request(`/api/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Custom Fields & SLAs & Rules
  async getCustomFields(): Promise<CustomFieldDefinition[]> {
    return request('/api/custom-fields');
  },

  async createCustomField(payload: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    return request('/api/custom-fields', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCustomField(id: string, payload: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    return request(`/api/custom-fields/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomField(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/custom-fields/${id}`, {
      method: 'DELETE',
    });
  },

  async reorderCustomFields(orderedIds: string[]): Promise<{ success: boolean; fields: CustomFieldDefinition[] }> {
    return request('/api/custom-fields/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  async getSlaPolicies(): Promise<SlaPolicy[]> {
    return request('/api/sla-policies');
  },

  async updateSlaPolicy(id: string, payload: Partial<SlaPolicy>): Promise<SlaPolicy> {
    return request(`/api/sla-policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getAutomationRules(): Promise<AutomationRule[]> {
    return request('/api/automation-rules');
  },

  async createAutomationRule(rule: Partial<AutomationRule>): Promise<AutomationRule> {
    return request('/api/automation-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  },

  async updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    return request(`/api/automation-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteAutomationRule(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/automation-rules/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleAutomationRule(id: string): Promise<AutomationRule> {
    return request(`/api/automation-rules/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  // OTP Verification for Users
  async sendOtp(email: string): Promise<{ success: boolean; message: string; previewCode: string; expiresInSeconds: number }> {
    return request('/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; verified: boolean; message: string }> {
    return request('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  async getOtpStatus(email: string): Promise<{ verified: boolean }> {
    return request(`/api/auth/otp/status?email=${encodeURIComponent(email)}`);
  },

  // Admin & Super Admin Mailboxes (IMAP / POP3 / SMTP)
  async getAdminMailboxes(): Promise<MailboxConnectionConfig[]> {
    return request('/api/admin/mailboxes');
  },

  async getUserMailbox(userId: string): Promise<MailboxConnectionConfig> {
    return request(`/api/admin/mailboxes/user/${userId}`);
  },

  async saveUserMailbox(userId: string, data: Partial<MailboxConnectionConfig>): Promise<MailboxConnectionConfig> {
    return request(`/api/admin/mailboxes/user/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async testMailboxConnection(data: any): Promise<any> {
    return request('/api/admin/mailboxes/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Default Email Gateway (IMAP / POP3 / SMTP)
  async getDefaultGatewayConfig(): Promise<DefaultEmailGatewayConfig> {
    return request('/api/email/default-gateway');
  },

  async saveDefaultGatewayConfig(data: Partial<DefaultEmailGatewayConfig>): Promise<DefaultEmailGatewayConfig> {
    return request('/api/email/default-gateway', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async testDefaultGateway(testRecipientEmail?: string): Promise<any> {
    return request('/api/email/default-gateway/test', {
      method: 'POST',
      body: JSON.stringify({ testRecipientEmail }),
    });
  },

  // Email Channels & Simulation
  async getEmailChannels(): Promise<EmailChannel[]> {
    return request('/api/email-channels');
  },

  async simulateInboundEmail(from: string, subject: string, body: string, cc?: string, managerEmail?: string): Promise<{ mode: string; ticket: Ticket; comment?: any }> {
    return request('/api/email/simulate-inbound', {
      method: 'POST',
      body: JSON.stringify({ from, subject, body, cc, managerEmail }),
    });
  },

  // Reports
  async getReportsMetrics(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    criticalTickets: number;
    overdueTickets: number;
    slaCompliancePercent: number;
    avgResolutionHours: number;
    avgFirstResponseMinutes: number;
    csatScore: string;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byTechnician: Record<string, number>;
  }> {
    return request('/api/reports/metrics');
  },

  // Superadmin
  async getSuperadminStats(): Promise<{
    totalOrganizations: number;
    activeTenants: number;
    totalUsers: number;
    totalTickets: number;
    totalAssets: number;
    systemUptimeHours: number;
    emailQueueHealth: string;
    backgroundWorkerStatus: string;
    databaseSizeKb: number;
  }> {
    return request('/api/superadmin/stats');
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return request('/api/audit-logs');
  },

  // System Settings
  async getSystemSettings(): Promise<any> {
    return request('/api/system-settings');
  },

  async updateSystemSettings(payload: any): Promise<any> {
    return request('/api/system-settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Surveys & CSAT Ratings Management
  async getSurveys(): Promise<SatisfactionSurvey[]> {
    return request('/api/surveys');
  },

  async submitSurvey(ticketId: string, rating: number, comment?: string): Promise<SatisfactionSurvey> {
    return request('/api/surveys', {
      method: 'POST',
      body: JSON.stringify({ ticketId, rating, comment }),
    });
  },

  async deleteSurvey(id: string): Promise<{ success: boolean; deletedSurveyId: string }> {
    return request(`/api/surveys/${id}`, {
      method: 'DELETE',
    });
  },

  // User Self-Service Password Change
  async changePassword(userId: string, newPassword: string, currentPassword?: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword, currentPassword }),
    });
  },

  // Auth & PSK Password Setup
  async setPasswordWithPsk(payload: { emailOrUserId: string; psk: string; newPassword: string }): Promise<any> {
    return request('/api/auth/set-password-psk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Superadmin Reset Password for Any User
  async resetUserPassword(userId: string, newPassword: string): Promise<any> {
    return request(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  // Superadmin Ticket Purge by Date Range
  async purgeOldTickets(payload: { startDate: string; endDate: string; statusFilter?: string }): Promise<any> {
    return request('/api/superadmin/tickets/purge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Asset Management: Status Update & Bulk Status
  async updateAssetStatus(assetId: string, status: string): Promise<Asset> {
    return request(`/api/assets/${assetId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async bulkUpdateAssetStatus(assetIds: string[], status: string): Promise<any> {
    return request('/api/assets/bulk-update-status', {
      method: 'POST',
      body: JSON.stringify({ assetIds, status }),
    });
  },

  async bulkDeleteAssets(assetIds: string[]): Promise<{ success: boolean; deletedCount: number; remainingCount: number }> {
    return request('/api/assets/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ assetIds }),
    });
  },

  async bulkCreateAssets(assets: Partial<Asset>[]): Promise<{ success: boolean; createdCount: number; createdAssets: Asset[] }> {
    return request('/api/assets/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ assets }),
    });
  },

  // Teams & Requester Groups
  async getTeams(): Promise<Team[]> {
    return request('/api/teams');
  },

  async createTeam(payload: Partial<Team>): Promise<Team> {
    return request('/api/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTeam(id: string, payload: Partial<Team>): Promise<Team> {
    return request(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteTeam(id: string): Promise<{ success: boolean; deletedTeamId: string }> {
    return request(`/api/teams/${id}`, {
      method: 'DELETE',
    });
  },

  // System Backup & Restore
  async downloadBackup(): Promise<Blob> {
    const sessionToken = getSessionToken();
    const res = await fetch('/api/system/backup', {
      headers: {
        'x-session-token': sessionToken,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to download backup');
    }
    return res.blob();
  },

  async restoreBackup(payload: any): Promise<{ success: boolean; message: string }> {
    return request('/api/system/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

