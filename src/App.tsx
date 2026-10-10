import React, { useState, useEffect, useCallback } from 'react';
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

  // Active View Navigation
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetailData, setTicketDetailData] = useState<{
    ticket: Ticket;
    comments: TicketComment[];
    tasks: TaskItem[];
    workLogs: WorkLog[];
    auditLogs: AuditLog[];
  } | null>(null);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial load
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
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
      ] = await Promise.all([
        api.getTickets(),
        api.getAssets(),
        api.getKnowledgeArticles(),
        api.getServiceCatalog(),
        api.getApprovals(),
        api.getCustomFields(),
        api.getSlaPolicies(),
        api.getAutomationRules(),
        api.getEmailChannels(),
        api.getReportsMetrics(),
        api.getAuditLogs(),
        api.getOrganizations(),
        api.getSuperadminStats(),
        api.getAdminMailboxes(),
        api.getDefaultGatewayConfig(),
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
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
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

  const handleSelectTicket = (id: string) => {
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

  const handleAddComment = async (ticketId: string, content: string, isInternal: boolean) => {
    try {
      const comment = await api.addComment(ticketId, content, isInternal);
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

  if (loading || !currentUser || !organization) {
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
  const ticketCounts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    unassigned: tickets.filter((t) => !t.assignedTechnicianId && t.status !== 'resolved' && t.status !== 'closed').length,
    critical: tickets.filter((t) => t.priority === 'critical' && t.status !== 'resolved').length,
    overdue: tickets.filter((t) => t.dueDate && t.dueDate < new Date().toISOString() && t.status !== 'resolved').length,
    pendingApprovals: approvals.filter((a) => a.status === 'pending').length,
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-[#0b1120] text-slate-100' : 'bg-[#f1f5f9] text-slate-900'} flex flex-col font-sans transition-colors`}>
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
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation (Hidden in portal mode or for requesters) */}
        {activeView !== 'portal' && (
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && metrics && (
              <DashboardView
                metrics={metrics}
                tickets={tickets}
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

            {activeView === 'tickets' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="all"
              />
            )}

            {activeView === 'tickets-my' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="open"
              />
            )}

            {activeView === 'tickets-unassigned' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="unassigned"
              />
            )}

            {activeView === 'tickets-critical' && (
              <TicketListView
                tickets={tickets}
                users={availableUsers}
                onSelectTicket={handleSelectTicket}
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onBulkUpdate={handleBulkUpdate}
                onDeleteTicket={handleDeleteTicket}
                currentUserRole={currentUser.role}
                initialQueue="critical"
              />
            )}

            {activeView === 'ticket-detail' && ticketDetailData && (
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
                  setActiveView('tickets');
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
                onOpenNewTicket={() => setIsNewTicketOpen(true)}
                onSelectTicket={handleSelectTicket}
                onNavigateToCatalog={() => setActiveView('catalog')}
                onNavigateToKb={() => setActiveView('kb')}
                onSubmitSurvey={handleSubmitSurvey}
                onSubmitTicket={handleCreateTicket}
                onUserRegistered={handleUserRegistered}
              />
            )}

            {activeView === 'assets' && (
              <AssetListView
                assets={assets}
                users={availableUsers}
                onCreateAsset={handleCreateAsset}
                onDeleteAsset={handleDeleteAsset}
                currentUserRole={currentUser.role}
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

            {activeView === 'approvals' && (
              <ApprovalsView
                approvals={approvals}
                onDecideApproval={handleDecideApproval}
                onSelectTicket={handleSelectTicket}
              />
            )}

            {activeView === 'reports' && metrics && (
              <ReportsView metrics={metrics} tickets={tickets} />
            )}

            {activeView === 'email-channels' && (
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

            {activeView === 'settings' && (
              <SettingsView
                organization={organization}
                currentUser={currentUser}
                availableUsers={availableUsers}
                customFields={customFields}
                slaPolicies={slaPolicies}
                automationRules={automationRules}
                adminMailboxes={adminMailboxes}
                defaultGateway={defaultGateway || fallbackGateway}
                onUpdateOrganization={(id, payload) => {
                  api.updateOrganization(id, payload);
                  setOrganization({ ...organization, ...payload });
                  showToast('Organization branding updated!');
                }}
                onCreateCustomField={handleCreateCustomField}
                onUpdateCustomField={handleUpdateCustomField}
                onDeleteCustomField={handleDeleteCustomField}
                onReorderCustomFields={handleReorderCustomFields}
                onToggleRule={handleToggleRule}
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

            {activeView === 'superadmin' && superadminStats && (
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
