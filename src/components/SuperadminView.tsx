import React, { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Building,
  Users,
  Database,
  Activity,
  Key,
  HardDrive,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  UserPlus,
  Layers,
  Grid,
  X,
} from 'lucide-react';
import { Organization, AuditLog, User as UserType, UserRole, ServiceCatalogItem } from '../types';

interface SuperadminViewProps {
  organizations: Organization[];
  auditLogs: AuditLog[];
  users?: UserType[];
  catalogItems?: ServiceCatalogItem[];
  stats: {
    totalOrganizations: number;
    activeTenants: number;
    totalUsers: number;
    totalTickets: number;
    totalAssets: number;
    systemUptimeHours: number;
    emailQueueHealth: string;
    backgroundWorkerStatus: string;
    databaseSizeKb: number;
  };
  onCreateOrganization?: (data: Partial<Organization>) => void;
  onUpdateOrganization?: (id: string, data: Partial<Organization>) => void;
  onDeleteOrganization?: (id: string) => void;
  onCreateAgent?: (data: Partial<UserType>) => void;
  onUpdateUser?: (id: string, data: Partial<UserType>) => void;
  onDeleteUser?: (id: string) => void;
  onCreateCatalogItem?: (data: Partial<ServiceCatalogItem>) => void;
  onUpdateCatalogItem?: (id: string, data: Partial<ServiceCatalogItem>) => void;
  onDeleteCatalogItem?: (id: string) => void;
}

export const SuperadminView: React.FC<SuperadminViewProps> = ({
  organizations,
  auditLogs,
  users = [],
  catalogItems = [],
  stats,
  onCreateOrganization,
  onUpdateOrganization,
  onDeleteOrganization,
  onCreateAgent,
  onUpdateUser,
  onDeleteUser,
  onCreateCatalogItem,
  onUpdateCatalogItem,
  onDeleteCatalogItem,
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'agents' | 'catalogs' | 'audit' | 'system'>('tenants');
  const [searchAudit, setSearchAudit] = useState('');
  const [searchCatalog, setSearchCatalog] = useState('');
  const [searchTenant, setSearchTenant] = useState('');
  const [searchAgent, setSearchAgent] = useState('');

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<UserType | null>(null);
  const [catalogToEdit, setCatalogToEdit] = useState<ServiceCatalogItem | null>(null);
  const [catalogToDelete, setCatalogToDelete] = useState<ServiceCatalogItem | null>(null);

  // Catalog Form state
  const [catTitle, setCatTitle] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catCategory, setCatCategory] = useState('Hardware & Workstations');
  const [catIcon, setCatIcon] = useState('Laptop');
  const [catHours, setCatHours] = useState(24);
  const [catApproval, setCatApproval] = useState(false);
  const [catPriority, setCatPriority] = useState<any>('normal');

  // New Organization form state
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [orgPlan, setOrgPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [orgStorageMb, setOrgStorageMb] = useState(500);

  // New Agent form state
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentRole, setAgentRole] = useState<UserRole>('technician');
  const [agentTitle, setAgentTitle] = useState('IT Support Specialist');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentOrgId, setAgentOrgId] = useState(organizations[0]?.id || '');

  // Filtered lists
  const filteredOrganizations = organizations.filter((org) => {
    if (!searchTenant) return true;
    const q = searchTenant.toLowerCase();
    return org.name.toLowerCase().includes(q) || org.domain.toLowerCase().includes(q) || org.id.toLowerCase().includes(q);
  });

  const agentsList = users.filter((u) => u.role === 'technician' || u.role === 'manager' || u.role === 'admin' || u.role === 'superadmin');
  const filteredAgents = agentsList.filter((a) => {
    if (!searchAgent) return true;
    const q = searchAgent.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.title && a.title.toLowerCase().includes(q)) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchAudit) return true;
    const q = searchAudit.toLowerCase();
    return (
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q)
    );
  });

  const handleCreateOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgDomain || !onCreateOrganization) return;
    onCreateOrganization({
      name: orgName,
      domain: orgDomain,
      plan: orgPlan,
      storageUsedMb: Number(orgStorageMb),
    });
    setShowOrgModal(false);
    setOrgName('');
    setOrgDomain('');
  };

  const handleCreateAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName || !agentEmail || !onCreateAgent) return;
    onCreateAgent({
      name: agentName,
      email: agentEmail,
      role: agentRole,
      title: agentTitle,
      phone: agentPhone,
      organizationId: agentOrgId || organizations[0]?.id,
    });
    setShowAgentModal(false);
    setAgentName('');
    setAgentEmail('');
    setAgentPhone('');
  };

  return (
    <div className="space-y-6">
      {/* Delete Org Modal */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Organization</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove tenant and its workspaces</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete organization <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{orgToDelete.name}&rdquo;</span> ({orgToDelete.domain})? This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrgToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOrganization) {
                    onDeleteOrganization(orgToDelete.id);
                    setOrgToDelete(null);
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Agent Modal */}
      {agentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Support Agent</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Revoke permissions and delete agent profile</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to remove agent <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{agentToDelete.name}&rdquo;</span> ({agentToDelete.email}) with role <span className="font-mono text-cyan-600 dark:text-cyan-400">[{agentToDelete.role}]</span>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAgentToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteUser) {
                    onDeleteUser(agentToDelete.id);
                    setAgentToDelete(null);
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Remove Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          Superadmin Platform Management Console
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create &amp; delete organizations, manage support agents/technicians, inspect audit logs, and monitor server health.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customer Tenants</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {stats.totalOrganizations}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">All tenants operational</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Support Agents</div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-mono tabular-nums">
            {agentsList.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Technicians, managers &amp; admins</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Platform Uptime</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats.systemUptimeHours}h
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">99.98% Service Availability</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Database Persistence</div>
          <div className="text-2xl font-bold text-violet-600 dark:text-violet-400 font-mono tabular-nums">
            {stats.databaseSizeKb} KB
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Atomic file-backed JSON store</div>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-white/10 w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tenants'
              ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Organizations ({organizations.length})
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'agents'
              ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Support Agents ({agentsList.length})
        </button>
        <button
          onClick={() => setActiveTab('catalogs')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'catalogs'
              ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Service Catalogs ({catalogItems.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Security Audit Trail ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'system'
              ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Linux &amp; Engine Health
        </button>
      </div>

      {/* TAB 1: Organizations Management */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations by name or domain..."
                value={searchTenant}
                onChange={(e) => setSearchTenant(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => setShowOrgModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Create Organization
            </button>
          </div>

          <div className="glass-panel rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Organization Name</th>
                    <th className="py-3 px-3">Domain</th>
                    <th className="py-3 px-3">Tier Plan</th>
                    <th className="py-3 px-3">Storage Quota</th>
                    <th className="py-3 px-3">Ticket Volume</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{org.name}</div>
                        <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">{org.id}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{org.domain}</td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-mono bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800/40">
                          {org.plan}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{org.storageUsedMb} MB / 5 GB</td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 tabular-nums">{org.ticketCount}</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold capitalize font-mono text-[11px]">
                          ● {org.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setOrgToDelete(org)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={`Delete organization ${org.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Support Agents Management */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search support agents by name, email, or role..."
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => setShowAgentModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" /> Add Support Agent
            </button>
          </div>

          <div className="glass-panel rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Agent Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Job Post / Title</th>
                    <th className="py-3 px-3">System Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-[10px]">
                            {agent.name.charAt(0)}
                          </div>
                          <span>{agent.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 ml-8">{agent.id}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{agent.email}</td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                        {agent.title || 'Support Engineer'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/40">
                          {agent.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold capitalize font-mono text-[11px]">
                          ● {agent.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setAgentToDelete(agent)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={`Remove agent ${agent.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Service Catalogs Management */}
      {activeTab === 'catalogs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog offerings by title, category..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => {
                setCatalogToEdit(null);
                setCatTitle('');
                setCatDescription('');
                setCatCategory('Hardware & Workstations');
                setCatIcon('Laptop');
                setCatHours(24);
                setCatApproval(false);
                setCatPriority('normal');
                setShowCatalogModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Catalog Offering
            </button>
          </div>

          <div className="neu-flat rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Offering Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">SLA Turnaround</th>
                    <th className="py-3 px-3">Approval Required</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {catalogItems
                    .filter((c) => {
                      if (!searchCatalog) return true;
                      const q = searchCatalog.toLowerCase();
                      return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-mono text-[10px]">
                              {item.icon}
                            </span>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.description}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                          ~{item.estimatedHours} hours
                        </td>
                        <td className="py-3 px-3">
                          {item.requiresApproval ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              Yes ({item.approverRole || 'Manager'})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No Approval</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize font-mono text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold">
                            {item.defaultPriority}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCatalogToEdit(item);
                                setCatTitle(item.title);
                                setCatDescription(item.description);
                                setCatCategory(item.category);
                                setCatIcon(item.icon);
                                setCatHours(item.estimatedHours);
                                setCatApproval(item.requiresApproval);
                                setCatPriority(item.defaultPriority);
                                setShowCatalogModal(true);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                              title={`Edit offering ${item.title}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCatalogToDelete(item)}
                              className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={`Delete offering ${item.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Catalog Item Modal */}
      {catalogToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Catalog Offering</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove service catalog offering</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete catalog offering &ldquo;<strong>{catalogToDelete.title}</strong>&rdquo;? Requesters will no longer be able to select this service item.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCatalogToDelete(null)}
                className="neu-btn px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCatalogItem) {
                    onDeleteCatalogItem(catalogToDelete.id);
                    setCatalogToDelete(null);
                  }
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Offering
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Catalog Item Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                {catalogToEdit ? 'Edit Service Catalog Offering' : 'Add Service Catalog Offering'}
              </h3>
              <button onClick={() => setShowCatalogModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!catTitle.trim()) return;
                if (catalogToEdit && onUpdateCatalogItem) {
                  onUpdateCatalogItem(catalogToEdit.id, {
                    title: catTitle,
                    description: catDescription,
                    category: catCategory,
                    icon: catIcon,
                    estimatedHours: Number(catHours),
                    requiresApproval: catApproval,
                    defaultPriority: catPriority,
                  });
                } else if (onCreateCatalogItem) {
                  onCreateCatalogItem({
                    title: catTitle,
                    description: catDescription,
                    category: catCategory,
                    icon: catIcon,
                    estimatedHours: Number(catHours),
                    requiresApproval: catApproval,
                    defaultPriority: catPriority,
                  });
                }
                setShowCatalogModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Offering Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud Sandbox Account Request"
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed description of service delivery and fulfillment..."
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="neu-input w-full p-2.5 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Category</label>
                  <select
                    value={catCategory}
                    onChange={(e) => setCatCategory(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                    <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                    <option value="Security & Access">Security &amp; Access</option>
                    <option value="Network & Connectivity">Network &amp; Connectivity</option>
                    <option value="Office & Facilities">Office &amp; Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Icon</label>
                  <select
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Laptop">Laptop Workstation</option>
                    <option value="Layers">Software Layers</option>
                    <option value="Shield">Security Shield</option>
                    <option value="Wifi">Network Wifi</option>
                    <option value="HardDrive">Hard Drive</option>
                    <option value="Cpu">Compute</option>
                    <option value="Grid">Grid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Fulfillment SLA (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={catHours}
                    onChange={(e) => setCatHours(Number(e.target.value))}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Default Priority</label>
                  <select
                    value={catPriority}
                    onChange={(e) => setCatPriority(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="low">Low (P4)</option>
                    <option value="normal">Normal (P3)</option>
                    <option value="high">High (P2)</option>
                    <option value="urgent">Urgent (P1)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-xl neu-card flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-appr"
                  checked={catApproval}
                  onChange={(e) => setCatApproval(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="cat-appr" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Requires Line Manager Approval Prior to Fulfillment
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                  className="neu-btn px-3 py-1.5 text-xs rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm cursor-pointer"
                >
                  {catalogToEdit ? 'Save Changes' : 'Create Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="glass-panel p-3 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter audit trail by actor, ticket ID, or action..."
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
              className="w-full text-xs bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="glass-panel rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3 w-40">Timestamp</th>
                    <th className="py-3 px-3">Actor / Role</th>
                    <th className="py-3 px-3">Action Identifier</th>
                    <th className="py-3 px-3">Target Entity</th>
                    <th className="py-3 px-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                        <span className="font-sans font-medium text-slate-900 dark:text-white">{log.actorName}</span>
                        <span className="text-slate-500 ml-1">({log.actorRole})</span>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400 font-bold">{log.action}</td>
                      <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-300">{log.entityId}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans text-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: System Health */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Runtime Environment &amp; Hosting
            </h3>
            <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Platform:</span>
                <span className="font-mono">Linux Server (x86_64)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Node.js Engine:</span>
                <span className="font-mono">v22.x LTS</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Memory RSS:</span>
                <span className="font-mono">84.2 MB</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Port &amp; Proxy:</span>
                <span className="font-mono">Port 3000 (Express + Nginx)</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Data Integrity &amp; Storage
            </h3>
            <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Primary Database:</span>
                <span className="font-mono">data/database.json</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Write Mode:</span>
                <span className="font-mono">Atomic fs.writeFileSync</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Database Size:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{stats.databaseSizeKb} KB</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Tenant Multi-Tenancy:</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400">Enforced</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Provision Organization */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Provision New Customer Organization
            </h3>

            <form onSubmit={handleCreateOrgSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Dynamics Ltd"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Domain *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. apexdynamics.io"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subscription Plan</label>
                  <select
                    value={orgPlan}
                    onChange={(e) => setOrgPlan(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Storage (MB)</label>
                  <input
                    type="number"
                    value={orgStorageMb}
                    onChange={(e) => setOrgStorageMb(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Provision Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Support Agent */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Add Support Agent / Technician
            </h3>

            <form onSubmit={handleCreateAgentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya.lin@company.com"
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Post / Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Tier-2 Helpdesk Agent"
                    value={agentTitle}
                    onChange={(e) => setAgentTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role Permission *</label>
                  <select
                    value={agentRole}
                    onChange={(e) => setAgentRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="technician">Technician / Agent</option>
                    <option value="manager">Service Desk Manager</option>
                    <option value="admin">System Administrator</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Add Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
