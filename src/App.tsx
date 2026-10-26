import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TicketListView } from './components/TicketListView';
import { TicketDetailView } from './components/TicketDetailView';
import { PortalView } from './components/PortalView';
import { AssetListView } from './components/AssetListView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { ServiceCatalogView } from './components/ServiceCatalogView';
import { ApprovalsView } from './components/ApprovalsView';
import { ReportsView } from './components/ReportsView';
import { EmailChannelsView } from './components/EmailChannelsView';
import { SettingsView } from './components/SettingsView';
import { SuperadminView } from './components/SuperadminView';
import { NewTicketModal } from './components/NewTicketModal';
import { CommandPalette } from './components/CommandPalette';
import { AuthLoginModal } from './components/AuthLoginModal';
import { api } from './services/api';
import {
  Ticket,
  TicketComment,
  TaskItem,
  WorkLog,
  AuditLog,
  User,
  Organization,
  Asset,
  KnowledgeArticle,
  ServiceCatalogItem,
  ApprovalRequest,
  CustomFieldDefinition,
  SlaPolicy,
  AutomationRule,
  EmailChannel,
  MailboxConnectionConfig,
  DefaultEmailGatewayConfig,
} from './types';

const fallbackGateway: DefaultEmailGatewayConfig = {
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
};

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('it_helpdesk_theme') !== 'light';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('it_helpdesk_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('it_helpdesk_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Application Data States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicy[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [emailChannels, setEmailChannels] = useState<EmailChannel[]>([]);
  const [adminMailboxes, setAdminMailboxes] = useState<MailboxConnectionConfig[]>([]);
  const [defaultGateway, setDefaultGateway] = useState<DefaultEmailGatewayConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [superadminStats, setSuperadminStats] = useState<any>(null);
  const [systemSettings, setSystemSettings] = useState<any>(null);

  // Active View Navigation - Default to end-user portal dashboard
  const [activeView, setActiveView] = useState<string>('portal');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetailData, setTicketDetailData] = useState<{
    ticket: Ticket;
    comments: TicketComment[];
    tasks: TaskItem[];
    workLogs: WorkLog[];
    auditLogs: AuditLog[];
  } | null>(null);

  // UI state & Separate Login Modal state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalPortalType, setLoginModalPortalType] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial load & silent background synchronization
  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      const session = await api.getSession();
      setCurrentUser(session.user);
      setOrganization(session.organization);
      setAvailableUsers(session.availableUsers);

      const [
        ticketsData,
        assetsData,
        kbData,
        catalogData,
        approvalsData,
        fieldsData,
        slaData,
        rulesData,
        channelsData,
        metricsData,
        auditData,
        orgsData,
        saStatsData,
        adminMailboxesData,
        defaultGatewayData,
        settingsData,
      ] = await Promise.all([
        api.getTickets().catch(() => []),
        api.getAssets().catch(() => []),
        api.getKnowledgeArticles().catch(() => []),
        api.getServiceCatalog().catch(() => []),
        api.getApprovals().catch(() => []),
        api.getCustomFields().catch(() => []),
        api.getSlaPolicies().catch(() => []),
        api.getAutomationRules().catch(() => []),
        api.getEmailChannels().catch(() => []),
        api.getReportsMetrics().catch(() => null),
        api.getAuditLogs().catch(() => []),
        api.getOrganizations().catch(() => []),
        api.getSuperadminStats().catch(() => null),
        api.getAdminMailboxes().catch(() => []),
        api.getDefaultGatewayConfig().catch(() => null),
        api.getSystemSettings().catch(() => null),
      ]);

      setTickets(ticketsData);
      setAssets(assetsData);
      setKnowledgeArticles(kbData);
      setServiceCatalog(catalogData);
      setApprovals(approvalsData);
      setCustomFields(fieldsData);
      setSlaPolicies(slaData);
      setAutomationRules(rulesData);
      setEmailChannels(channelsData);
      setMetrics(metricsData);
      setAuditLogs(auditData);
      setOrganizations(orgsData);
      setSuperadminStats(saStatsData);
      setAdminMailboxes(adminMailboxesData || []);
      if (defaultGatewayData) {
        setDefaultGateway(defaultGatewayData);
      }
      if (settingsData) {
        setSystemSettings(settingsData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Load ticket details when selected
  useEffect(() => {
    if (selectedTicketId) {
      api.getTicket(selectedTicketId).then((data) => {
        setTicketDetailData(data);
      }).catch((err) => {
        console.error('Failed loading ticket detail:', err);
      });
    } else {
      setTicketDetailData(null);
    }
  }, [selectedTicketId]);

  // Handlers
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setCurrentUser(res.user);
      setOrganization(res.organization);
      showToast(`Impersonating ${res.user.name} (${res.user.role.toUpperCase()})`);
      if (res.user.role === 'requester') {
        setActiveView('portal');
      }
      loadData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      setActiveView('portal');
      showToast('Signed out. You are now browsing as Guest.');
      loadData();
    } catch (err: any) {
      console.error('Logout error:', err);
      setCurrentUser(null);
      setActiveView('portal');
    }
  };

  const [previousTicketView, setPreviousTicketView] = useState<string>('tickets');
  const [ticketListPage, setTicketListPage] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('ticket_list_page');
      return saved ? parseInt(saved, 10) || 1 : 1;
    } catch {
      return 1;
    }
  });
  const [ticketListPageSize, setTicketListPageSize] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('ticket_list_page_size');
      return saved ? parseInt(saved, 10) || 25 : 25;
    } catch {
      return 25;
    }
  });
  const [ticketListIsCustomMode, setTicketListIsCustomMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ticket_list_custom_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [ticketListCustomInput, setTicketListCustomInput] = useState<string>(() => {
    try {
      return sessionStorage.getItem('ticket_list_custom_input') || '25';
    } catch {
      return '25';
    }
  });

  const handleSelectTicket = (id: string) => {
    setPreviousTicketView(activeView);
    setSelectedTicketId(id);
    setActiveView('ticket-detail');
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      const created = await api.createTicket(ticketData);
      setTickets((prev) => [created, ...prev]);
      showToast(`Ticket [${created.id}] successfully created!`);
      loadData();
    } catch (err: any) {
      alert(`Error creating ticket: ${err.message}`);
    }
  };

  const [settingsInitialTab, setSettingsInitialTab] = useState<string>('profile');

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await api.deleteTicket(ticketId);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
        setActiveView('tickets');
      }
      showToast(`Ticket [${ticketId}] deleted permanently.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed deleting ticket');
    }
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      const updated = await api.updateTicket(id, updates);
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (ticketDetailData && ticketDetailData.ticket.id === id) {
        setTicketDetailData({ ...ticketDetailData, ticket: updated });
      }
      showToast(`Ticket [${id}] updated!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed updating ticket');
    }
  };

  const handleAddComment = async (ticketId: string, content: string, isInternal: boolean, attachments: any[] = []) => {
    try {
      const comment = await api.addComment(ticketId, content, isInternal, attachments);
      if (ticketDetailData && ticketDetailData.ticket.id === ticketId) {
        setTicketDetailData({
          ...ticketDetailData,
          comments: [...ticketDetailData.comments, comment],
        });
      }
      showToast(isInternal ? 'Confidential internal note saved' : 'Public reply sent to requester');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed sending comment');
    }
  };

  const handleAddTask = async (ticketId: string, title: string) => {
    try {
      const task = await api.addTask(ticketId, title);
      if (ticketDetailData && ticketDetailData.ticket.id === ticketId) {
        setTicketDetailData({
          ...ticketDetailData,
          tasks: [...ticketDetailData.tasks, task],
        });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleTask = async (ticketId: string, taskId: string, completed: boolean) => {
    try {
      const updated = await api.toggleTask(ticketId, taskId, completed);
      if (ticketDetailData && ticketDetailData.ticket.id === ticketId) {
        setTicketDetailData({
          ...ticketDetailData,
          tasks: ticketDetailData.tasks.map((t) => (t.id === taskId ? updated : t)),
        });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddWorkLog = async (ticketId: string, minutes: number, notes: string, billable: boolean) => {
    try {
      const log = await api.addWorkLog(ticketId, minutes, notes, billable);
      if (ticketDetailData && ticketDetailData.ticket.id === ticketId) {
        setTicketDetailData({
          ...ticketDetailData,
          workLogs: [...ticketDetailData.workLogs, log],
          ticket: {
            ...ticketDetailData.ticket,
            actualMinutesSpent: ticketDetailData.ticket.actualMinutesSpent + minutes,
          },
        });
      }
      showToast(`Logged ${minutes} minutes of work`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkUpdate = async (ticketIds: string[], action: string, value: string) => {
    try {
      await api.bulkUpdateTickets(ticketIds, action, value);
      showToast(`Bulk updated ${ticketIds.length} tickets`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAsset = async (assetData: Partial<Asset>) => {
    try {
      const created = await api.createAsset(assetData);
      setAssets((prev) => [created, ...prev]);
      showToast(`Asset [${created.id}] registered in CMDB!`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await api.deleteAsset(assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      showToast(`Asset [${assetId}] removed from CMDB.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed deleting asset');
    }
  };

  const handleUpdateAsset = async (assetId: string, data: Partial<Asset>) => {
    try {
      const updated = await api.updateAsset(assetId, data);
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)));
      showToast(`Asset [${assetId}] updated.`);
      loadData();
      return updated;
    } catch (err: any) {
      alert(err.message || 'Failed updating asset');
    }
  };

  const handleBulkDeleteAssets = async (assetIds: string[]) => {
    try {
      const res = await api.bulkDeleteAssets(assetIds);
      setAssets((prev) => prev.filter((a) => !assetIds.includes(a.id)));
      showToast(`Permanently deleted ${res.deletedCount} assets.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed bulk deleting assets');
    }
  };

  const handleBulkCreateAssets = async (newAssets: Partial<Asset>[]) => {
    try {
      const res = await api.bulkCreateAssets(newAssets);
      setAssets((prev) => [...res.createdAssets, ...prev]);
      showToast(`Bulk registered ${res.createdCount} assets!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed bulk creating assets');
    }
  };

  const handleCreateOrganization = async (data: Partial<Organization>) => {
    try {
      const created = await api.createOrganization(data);
      setOrganizations((prev) => [...prev, created]);
      showToast(`Organization "${created.name}" created!`);
      loadData();
      return created;
    } catch (err: any) {
      alert(err.message || 'Failed creating organization');
    }
  };

  const handleUpdateOrganization = async (id: string, data: Partial<Organization>) => {
    try {
      await api.updateOrganization(id, data);
      setOrganizations((prev) => prev.map((o) => (o.id === id ? { ...o, ...data } : o)));
      if (organization && organization.id === id) {
        setOrganization({ ...organization, ...data });
      }
      showToast('Organization settings updated!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed updating organization');
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    try {
      await api.deleteOrganization(id);
      setOrganizations((prev) => prev.filter((o) => o.id !== id));
      showToast('Organization deleted permanently.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed deleting organization');
    }
  };

  const handleCreateUser = async (data: Partial<User>) => {
    try {
      const created = await api.createUser(data);
      setAvailableUsers((prev) => [...prev, created]);
      showToast(`User ${created.name} registered successfully!`);
      loadData();
      return created;
    } catch (err: any) {
      alert(err.message || 'Failed registering user');
    }
  };

  const handleCreateAgent = async (data: Partial<User>) => {
    return handleCreateUser(data);
  };

  const handleUpdateUser = async (id: string, data: Partial<User>) => {
    try {
      const updated = await api.updateUser(id, data);
      setAvailableUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      if (currentUser && currentUser.id === id) {
        setCurrentUser(updated);
      }
      showToast(`User ${updated.name} updated.`);
      loadData();
      return updated;
    } catch (err: any) {
      alert(err.message || 'Failed updating user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    const target = availableUsers.find((u) => u.id === id);
    if (target?.role === 'superadmin') {
      alert('Super Admin accounts are permanently protected system identities and cannot be deleted by anyone.');
      return;
    }
    try {
      await api.deleteUser(id);
      setAvailableUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('User deleted from directory.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed deleting user');
    }
  };

  const handleUserRegistered = (newUser: User) => {
    setAvailableUsers((prev) => [...prev, newUser]);
    showToast(`Welcome ${newUser.name}! Account registered.`);
    loadData();
  };

  const handleCreateArticle = async (articleData: Partial<KnowledgeArticle>) => {
    try {
      const created = await api.createKnowledgeArticle(articleData);
      setKnowledgeArticles((prev) => [created, ...prev]);
      showToast(`Knowledge article published!`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateArticle = async (id: string, articleData: Partial<KnowledgeArticle>) => {
    try {
      const updated = await api.updateKnowledgeArticle(id, articleData);
      setKnowledgeArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(`Knowledge article updated!`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await api.deleteKnowledgeArticle(id);
      setKnowledgeArticles((prev) => prev.filter((a) => a.id !== id));
      showToast('Knowledge article deleted.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVoteArticle = async (id: string, helpful: boolean) => {
    try {
      const updated = await api.voteArticle(id, helpful);
      setKnowledgeArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(helpful ? 'Thank you for your feedback!' : 'Feedback noted for review.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateCatalogItem = async (data: Partial<ServiceCatalogItem>) => {
    try {
      const created = await api.createCatalogItem(data);
      setServiceCatalog((prev) => [...prev, created]);
      showToast(`Service Catalog item "${created.title}" created!`);
      loadData();
      return created;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateCatalogItem = async (id: string, data: Partial<ServiceCatalogItem>) => {
    try {
      const updated = await api.updateCatalogItem(id, data);
      setServiceCatalog((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast(`Service Catalog item "${updated.title}" updated!`);
      loadData();
      return updated;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    try {
      await api.deleteCatalogItem(id);
      setServiceCatalog((prev) => prev.filter((c) => c.id !== id));
      showToast('Catalog item removed.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRequestCatalog = async (catalogItemId: string, formData: Record<string, any>) => {
    try {
      const res = await api.requestCatalogItem(catalogItemId, formData);
      setTickets((prev) => [res.ticket, ...prev]);
      showToast(`Service request lodged [${res.ticket.id}]!`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDecideApproval = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const updated = await api.decideApproval(id, status, notes);
      setApprovals((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(`Request ${status.toUpperCase()} successfully.`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCustomField = async (data: Partial<CustomFieldDefinition>) => {
    try {
      const created = await api.createCustomField(data);
      setCustomFields((prev) => [...prev, created]);
      showToast(`Custom field "${created.label}" added to schema.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateCustomField = async (id: string, data: Partial<CustomFieldDefinition>) => {
    try {
      const updated = await api.updateCustomField(id, data);
      setCustomFields((prev) => prev.map((f) => (f.id === id ? updated : f)));
      showToast(`Custom field "${updated.label}" updated.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCustomField = async (id: string) => {
    try {
      await api.deleteCustomField(id);
      setCustomFields((prev) => prev.filter((f) => f.id !== id));
      showToast('Custom field removed from schema.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReorderCustomFields = async (orderedIds: string[]) => {
    try {
      await api.reorderCustomFields(orderedIds);
      const reordered = [...customFields].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
      setCustomFields(reordered);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveUserMailbox = async (userId: string, data: Partial<MailboxConnectionConfig>) => {
    const saved = await api.saveUserMailbox(userId, data);
    setAdminMailboxes((prev) => {
      const idx = prev.findIndex((m) => m.userId === userId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    showToast(`Mailbox connection saved for ${saved.userEmail}`);
    return saved;
  };

  const handleTestUserMailbox = async (data: any) => {
    return api.testMailboxConnection(data);
  };

  const handleSaveDefaultGateway = async (data: Partial<DefaultEmailGatewayConfig>) => {
    const saved = await api.saveDefaultGatewayConfig(data);
    setDefaultGateway(saved);
    showToast('Default reply and polling gateway updated!');
    return saved;
  };

  const handleTestDefaultGateway = async (email?: string) => {
    return api.testDefaultGateway(email);
  };

  const handleToggleRule = async (id: string) => {
    try {
      const updated = await api.toggleAutomationRule(id);
      setAutomationRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast(`Rule "${updated.name}" is now ${updated.enabled ? 'ACTIVE' : 'DISABLED'}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAutomationRule = async (ruleData: Partial<AutomationRule>) => {
    try {
      const created = await api.createAutomationRule(ruleData);
      setAutomationRules((prev) => [...prev, created]);
      showToast(`Automation rule "${created.name}" created successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to create automation rule');
    }
  };

  const handleUpdateAutomationRule = async (id: string, updates: Partial<AutomationRule>) => {
    try {
      const updated = await api.updateAutomationRule(id, updates);
      setAutomationRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast(`Automation rule "${updated.name}" updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update automation rule');
    }
  };

  const handleDeleteAutomationRule = async (id: string) => {
    try {
      await api.deleteAutomationRule(id);
      setAutomationRules((prev) => prev.filter((r) => r.id !== id));
      showToast('Automation rule deleted successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete automation rule');
    }
  };

  const handleSimulateInboundEmail = async (from: string, subject: string, body: string) => {
    const res = await api.simulateInboundEmail(from, subject, body);
    showToast(
      res.mode === 'threaded'
        ? `Inbound email threaded to [${res.ticket.id}]`
        : `New ticket created from email [${res.ticket.id}]`
    );
    loadData();
    return res;
  };

  const handleSubmitSurvey = async (ticketId: string, rating: number, comment?: string) => {
    try {
      await api.submitSurvey(ticketId, rating, comment);
      showToast('Thank you! Your satisfaction feedback has been recorded.');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !organization) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
        <div className="text-sm font-semibold text-slate-300">
          Loading IT Helpdesk by Lakhan...
        </div>
      </div>
    );
  }

  // Calculate ticket counts for sidebar badges
  const totalOpenTickets = tickets.filter(
    (t) => t.status !== 'resolved' && t.status !== 'closed' && t.status !== 'cancelled'
  ).length;

  const ticketCounts = {
    all: tickets.length,
    open: totalOpenTickets,
    unassigned: tickets.filter((t) => !t.assignedTechnicianId && t.status !== 'resolved' && t.status !== 'closed').length,
    critical: tickets.filter((t) => t.priority === 'critical' && t.status !== 'resolved').length,
    overdue: tickets.filter((t) => t.dueDate && t.dueDate < new Date().toISOString() && t.status !== 'resolved').length,
    pendingApprovals: approvals.filter((a) => a.status === 'pending').length,
  };

  const isStaffLoggedIn = currentUser && currentUser.role !== 'requester';

  return (
    <div className={`h-screen max-h-screen overflow-hidden ${isDark ? 'dark bg-[#0b1120] text-slate-100' : 'bg-[#f1f5f9] text-slate-900'} flex flex-col font-sans transition-colors`}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-modal px-4 py-2.5 rounded-xl border border-cyan-500/50 shadow-2xl flex items-center gap-2 text-xs font-medium text-cyan-200 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        organization={organization}
        availableUsers={availableUsers}
        onSwitchUser={handleSwitchUser}
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'settings-profile') {
            setSettingsInitialTab('profile');
            setActiveView('settings');
            setSelectedTicketId(null);
          } else if (view === 'settings-users') {
            setSettingsInitialTab('users');
            setActiveView('settings');
            setSelectedTicketId(null);
          } else {
            setSelectedTicketId(null);
            setActiveView(view);
          }
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
        onOpenLogin={(type) => {
          setLoginModalPortalType(type || 'user');
          setIsLoginModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main Layout Area - Static Left Sidebar & Scrollable Main Canvas */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Sidebar Navigation (Only visible for authenticated IT staff outside portal) */}
        {activeView !== 'portal' && isStaffLoggedIn && (
          <Sidebar
            activeView={activeView}
            onNavigate={(view) => {
              if (view === 'settings-profile') {
                setSettingsInitialTab('profile');
                setActiveView('settings');
                setSelectedTicketId(null);
              } else {
                setSelectedTicketId(null);
                setActiveView(view);
              }
            }}
            userRole={currentUser.role}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            ticketCounts={ticketCounts}
          />
        )}

        {/* Viewport Content Canvas */}
        <main className="flex-1 overflow-y-auto h-full min-h-0 p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* If unauthenticated guest accesses an administrative view, show Admin Login Required guard */}
            {!currentUser && activeView !== 'portal' && activeView !== 'kb' && activeView !== 'catalog' && (
              <div className="max-w-md mx-auto my-12 p-8 neu-flat rounded-2xl border border-slate-300 dark:border-white/10 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-700/50 flex items-center justify-center mx-auto text-violet-600 dark:text-violet-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Authentication Required</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    This administrative view is reserved for authorized IT Administrators, Managers, and Technicians.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveView('portal')}
                    className="neu-btn px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Back to Portal
                  </button>
                  <button
                    onClick={() => {
                      setLoginModalPortalType('admin');
                      setIsLoginModalOpen(true);
                    }}
                    className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Sign In as Admin
                  </button>
                </div>
              </div>
            )}

            {currentUser && activeView === 'dashboard' && metrics && (
              <DashboardView
                metrics={metrics}
                tickets={tickets}
                users={availableUsers}
                auditLogs={auditLogs}
                onSelectTicket={handleSelectTicket}
                onNavigate={(v) => {
                  setSelectedTicketId(null);
                  setActiveView(v);
                }}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onOpenEmailSimulator={() => setActiveView('email-channels')}
              />
            )}

            {currentUser && activeView === 'tickets' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                organizations={organizations}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="all"
                currentPage={ticketListPage}
                onPageChange={(p) => {
                  setTicketListPage(p);
                  try { sessionStorage.setItem('ticket_list_page', String(p)); } catch {}
                }}
                pageSize={ticketListPageSize}
                onPageSizeChange={(s) => {
                  setTicketListPageSize(s);
                  try { sessionStorage.setItem('ticket_list_page_size', String(s)); } catch {}
                }}
                isCustomMode={ticketListIsCustomMode}
                onCustomModeChange={(m) => {
                  setTicketListIsCustomMode(m);
                  try { sessionStorage.setItem('ticket_list_custom_mode', String(m)); } catch {}
                }}
                customPageInput={ticketListCustomInput}
                onCustomPageInputChange={(val) => {
                  setTicketListCustomInput(val);
                  try { sessionStorage.setItem('ticket_list_custom_input', val); } catch {}
                }}
              />
            )}

            {currentUser && activeView === 'tickets-my' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                organizations={organizations}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="open"
                currentPage={ticketListPage}
                onPageChange={(p) => {
                  setTicketListPage(p);
                  try { sessionStorage.setItem('ticket_list_page', String(p)); } catch {}
                }}
                pageSize={ticketListPageSize}
                onPageSizeChange={(s) => {
                  setTicketListPageSize(s);
                  try { sessionStorage.setItem('ticket_list_page_size', String(s)); } catch {}
                }}
                isCustomMode={ticketListIsCustomMode}
                onCustomModeChange={(m) => {
                  setTicketListIsCustomMode(m);
                  try { sessionStorage.setItem('ticket_list_custom_mode', String(m)); } catch {}
                }}
                customPageInput={ticketListCustomInput}
                onCustomPageInputChange={(val) => {
                  setTicketListCustomInput(val);
                  try { sessionStorage.setItem('ticket_list_custom_input', val); } catch {}
                }}
              />
            )}

            {currentUser && activeView === 'tickets-unassigned' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                organizations={organizations}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="unassigned"
                currentPage={ticketListPage}
                onPageChange={(p) => {
                  setTicketListPage(p);
                  try { sessionStorage.setItem('ticket_list_page', String(p)); } catch {}
                }}
                pageSize={ticketListPageSize}
                onPageSizeChange={(s) => {
                  setTicketListPageSize(s);
                  try { sessionStorage.setItem('ticket_list_page_size', String(s)); } catch {}
                }}
                isCustomMode={ticketListIsCustomMode}
                onCustomModeChange={(m) => {
                  setTicketListIsCustomMode(m);
                  try { sessionStorage.setItem('ticket_list_custom_mode', String(m)); } catch {}
                }}
                customPageInput={ticketListCustomInput}
                onCustomPageInputChange={(val) => {
                  setTicketListCustomInput(val);
                  try { sessionStorage.setItem('ticket_list_custom_input', val); } catch {}
                }}
              />
            )}

            {currentUser && activeView === 'tickets-critical' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                organizations={organizations}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="critical"
                currentPage={ticketListPage}
                onPageChange={(p) => {
                  setTicketListPage(p);
                  try { sessionStorage.setItem('ticket_list_page', String(p)); } catch {}
                }}
                pageSize={ticketListPageSize}
                onPageSizeChange={(s) => {
                  setTicketListPageSize(s);
                  try { sessionStorage.setItem('ticket_list_page_size', String(s)); } catch {}
                }}
                isCustomMode={ticketListIsCustomMode}
                onCustomModeChange={(m) => {
                  setTicketListIsCustomMode(m);
                  try { sessionStorage.setItem('ticket_list_custom_mode', String(m)); } catch {}
                }}
                customPageInput={ticketListCustomInput}
                onCustomPageInputChange={(val) => {
                  setTicketListCustomInput(val);
                  try { sessionStorage.setItem('ticket_list_custom_input', val); } catch {}
                }}
              />
            )}

            {currentUser && activeView === 'ticket-detail' && ticketDetailData && (
              <TicketDetailView
                ticket={ticketDetailData.ticket}
                comments={ticketDetailData.comments}
                tasks={ticketDetailData.tasks}
                workLogs={ticketDetailData.workLogs}
                auditLogs={ticketDetailData.auditLogs}
                users={availableUsers}
                currentUser={currentUser}
                onBack={() => {
                  setSelectedTicketId(null);
                  setActiveView(previousTicketView || 'tickets');
                }}
                onUpdateTicket={handleUpdateTicket}
                onDeleteTicket={handleDeleteTicket}
                onAddComment={handleAddComment}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onAddWorkLog={handleAddWorkLog}
              />
            )}

            {activeView === 'portal' && (
              <PortalView
                currentUser={currentUser}
                tickets={tickets}
                knowledgeArticles={knowledgeArticles}
                serviceCatalog={serviceCatalog}
                customFields={customFields}
                organization={organization}
                organizations={organizations}
                assets={assets}
                allowRequesterAssetSelfService={systemSettings?.allowRequesterAssetSelfService ?? organization?.systemSettings?.allowRequesterAssetSelfService ?? true}
                onCreateAsset={handleCreateAsset}
                onUpdateAsset={handleUpdateAsset}
                onDeleteAsset={handleDeleteAsset}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onSelectTicket={handleSelectTicket}
                onNavigateToCatalog={() => setActiveView('catalog')}
                onNavigateToKb={() => setActiveView('kb')}
                onSubmitSurvey={handleSubmitSurvey}
                onSubmitTicket={handleCreateTicket}
                onUserRegistered={handleUserRegistered}
              />
            )}

            {currentUser && activeView === 'assets' && (
              <AssetListView
                assets={assets}
                users={availableUsers}
                onCreateAsset={handleCreateAsset}
                onUpdateAsset={handleUpdateAsset}
                onDeleteAsset={handleDeleteAsset}
                onBulkDeleteAssets={handleBulkDeleteAssets}
                onBulkCreateAssets={handleBulkCreateAssets}
                currentUserRole={currentUser.role}
                defaultCurrency={organization?.systemSettings?.defaultCurrency || '₹'}
                allowRequesterAssetSelfService={systemSettings?.allowRequesterAssetSelfService ?? organization?.systemSettings?.allowRequesterAssetSelfService ?? true}
                onToggleRequesterAssetSelfService={async () => {
                  const currentVal = systemSettings?.allowRequesterAssetSelfService ?? organization?.systemSettings?.allowRequesterAssetSelfService ?? true;
                  const nextVal = !currentVal;
                  try {
                    await api.updateSystemSettings({ allowRequesterAssetSelfService: nextVal });
                    setSystemSettings((prev: any) => ({ ...(prev || {}), allowRequesterAssetSelfService: nextVal }));
                    if (organization) {
                      setOrganization((prev: any) => ({
                        ...prev,
                        systemSettings: { ...(prev?.systemSettings || {}), allowRequesterAssetSelfService: nextVal },
                      }));
                    }
                    showToast(`Requester Asset Self-Service is now ${nextVal ? 'ENABLED' : 'DISABLED'}`);
                  } catch (err: any) {
                    alert(err.message || 'Failed to update asset self-service toggle');
                  }
                }}
              />
            )}

            {activeView === 'kb' && (
              <KnowledgeBaseView
                articles={knowledgeArticles}
                currentUser={currentUser}
                onCreateArticle={handleCreateArticle}
                onUpdateArticle={handleUpdateArticle}
                onDeleteArticle={handleDeleteArticle}
                onVoteArticle={handleVoteArticle}
              />
            )}

            {activeView === 'catalog' && (
              <ServiceCatalogView
                catalogItems={serviceCatalog}
                currentUser={currentUser}
                onRequestItem={handleRequestCatalog}
                onCreateCatalogItem={handleCreateCatalogItem}
                onUpdateCatalogItem={handleUpdateCatalogItem}
                onDeleteCatalogItem={handleDeleteCatalogItem}
              />
            )}

            {currentUser && activeView === 'approvals' && (
              <ApprovalsView
                approvals={approvals}
                onDecideApproval={handleDecideApproval}
                onSelectTicket={handleSelectTicket}
              />
            )}

            {currentUser && activeView === 'reports' && metrics && (
              <ReportsView metrics={metrics} tickets={tickets} users={availableUsers} />
            )}

            {currentUser && activeView === 'email-channels' && (
              <EmailChannelsView
                channels={emailChannels}
                adminMailboxes={adminMailboxes}
                defaultGateway={defaultGateway || fallbackGateway}
                availableUsers={availableUsers}
                currentUser={currentUser}
                onSimulateInbound={handleSimulateInboundEmail}
                onNavigateToSettings={() => setActiveView('settings')}
                onTestDefaultGateway={handleTestDefaultGateway}
                onTestUserMailbox={handleTestUserMailbox}
              />
            )}

            {currentUser && activeView === 'settings' && (
              <SettingsView
                organization={organization}
                organizations={organizations}
                currentUser={currentUser}
                availableUsers={availableUsers}
                customFields={customFields}
                slaPolicies={slaPolicies}
                automationRules={automationRules}
                adminMailboxes={adminMailboxes}
                defaultGateway={defaultGateway || fallbackGateway}
                assets={assets}
                onCreateAsset={handleCreateAsset}
                onUpdateAsset={handleUpdateAsset}
                onDeleteAsset={handleDeleteAsset}
                onBulkDeleteAssets={handleBulkDeleteAssets}
                onBulkCreateAssets={handleBulkCreateAssets}
                onUpdateOrganization={(id, payload) => {
                  api.updateOrganization(id, payload);
                  setOrganization({ ...organization, ...payload });
                  setOrganizations(prev => prev.map(o => o.id === id ? { ...o, ...payload } : o));
                  showToast('Organization settings updated!');
                }}
                onCreateCustomField={handleCreateCustomField}
                onUpdateCustomField={handleUpdateCustomField}
                onDeleteCustomField={handleDeleteCustomField}
                onReorderCustomFields={handleReorderCustomFields}
                onToggleRule={handleToggleRule}
                onCreateAutomationRule={handleCreateAutomationRule}
                onUpdateAutomationRule={handleUpdateAutomationRule}
                onDeleteAutomationRule={handleDeleteAutomationRule}
                onSaveUserMailbox={handleSaveUserMailbox}
                onTestUserMailbox={handleTestUserMailbox}
                onSaveDefaultGateway={handleSaveDefaultGateway}
                onTestDefaultGateway={handleTestDefaultGateway}
                onUpdateUser={handleUpdateUser}
                onCreateUser={handleCreateUser}
                onDeleteUser={handleDeleteUser}
                initialTab={settingsInitialTab}
              />
            )}

            {currentUser && activeView === 'superadmin' && currentUser.role !== 'superadmin' && (
              <div className="max-w-md mx-auto my-12 p-8 neu-flat rounded-2xl border border-rose-300 dark:border-rose-900/60 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/50 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Super Admin Access Required</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    The Super Admin Console is strictly reserved for the Super Administrator. Technicians, managers, and standard administrators do not have access to multi-tenant tenant controls or system-wide purge capabilities.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('tickets')}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Return to Tickets
                </button>
              </div>
            )}

            {currentUser && activeView === 'superadmin' && currentUser.role === 'superadmin' && superadminStats && (
              <SuperadminView
                organizations={organizations}
                auditLogs={auditLogs}
                users={availableUsers}
                catalogItems={serviceCatalog}
                stats={superadminStats}
                onCreateOrganization={handleCreateOrganization}
                onUpdateOrganization={handleUpdateOrganization}
                onDeleteOrganization={handleDeleteOrganization}
                onCreateAgent={handleCreateAgent}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onCreateCatalogItem={handleCreateCatalogItem}
                onUpdateCatalogItem={handleUpdateCatalogItem}
                onDeleteCatalogItem={handleDeleteCatalogItem}
              />
            )}
          </div>
        </main>
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onSubmit={handleCreateTicket}
        customFields={customFields}
        knowledgeArticles={knowledgeArticles}
        users={availableUsers}
        assets={assets}
        currentUser={currentUser}
        requireOtp={systemSettings?.ticketSubmissionOtpEnabled ?? false}
      />

      {/* Separate User Portal & Admin Login Modal */}
      <AuthLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialPortalType={loginModalPortalType}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoginModalOpen(false);
          showToast(`Welcome back, ${user.name}!`);
          if (user.role === 'requester') {
            setActiveView('portal');
          } else {
            setActiveView('dashboard');
          }
          loadData();
        }}
        onSwitchToRegister={() => {
          setIsLoginModalOpen(false);
          setActiveView('portal');
        }}
        onContinueAsGuest={() => {
          setIsLoginModalOpen(false);
          setActiveView('portal');
        }}
      />

      {/* Command Palette Modal (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tickets={tickets}
        assets={assets}
        articles={knowledgeArticles}
        onSelectTicket={handleSelectTicket}
        onNavigate={(v) => {
          setSelectedTicketId(null);
          setActiveView(v);
        }}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
        onOpenEmailSimulator={() => setActiveView('email-channels')}
      />
    </div>
  );
}
