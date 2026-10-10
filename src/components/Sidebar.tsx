import React from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  Inbox,
  AlertOctagon,
  Clock,
  CheckSquare,
  ShieldAlert,
  Server,
  BookOpen,
  Grid,
  BarChart3,
  Mail,
  Settings,
  ShieldCheck,
  User,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userRole: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  ticketCounts?: {
    all: number;
    open: number;
    unassigned: number;
    critical: number;
    overdue: number;
    pendingApprovals: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  userRole,
  collapsed,
  onToggleCollapse,
  ticketCounts,
}) => {
  const isRequester = userRole === 'requester';

  const navItem = (
    id: string,
    label: string,
    icon: React.ReactNode,
    badge?: number,
    badgeColor: string = 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/50'
  ) => {
    const isActive = activeView === id;
    return (
      <button
        onClick={() => onNavigate(id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all group cursor-pointer ${
          isActive
            ? 'neu-btn-primary shadow-xs'
            : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
        }`}
        title={collapsed ? label : undefined}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className={`${isActive ? 'text-white' : 'text-cyan-700 dark:text-cyan-400 group-hover:scale-105 transition-transform'}`}>
            {icon}
          </span>
          {!collapsed && <span className="truncate">{label}</span>}
        </div>
        {!collapsed && badge !== undefined && badge > 0 && (
          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : badgeColor}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`relative h-[calc(100vh-4rem)] neu-flat border-r border-slate-200/90 dark:border-white/10 transition-all duration-300 flex flex-col justify-between shrink-0 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
        {/* Main Workspaces */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Service Desk
            </div>
          )}
          <div className="space-y-1.5">
            {navItem('dashboard', 'Operations Dashboard', <LayoutDashboard className="w-4 h-4" />)}
            {navItem('tickets', 'All Tickets', <TicketIcon className="w-4 h-4" />, ticketCounts?.all)}
            {navItem('tickets-my', 'My Open Tickets', <Inbox className="w-4 h-4" />, ticketCounts?.open)}
            {navItem('tickets-unassigned', 'Unassigned Queue', <Clock className="w-4 h-4" />, ticketCounts?.unassigned, 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50')}
            {navItem('tickets-critical', 'Critical & Overdue', <AlertOctagon className="w-4 h-4" />, (ticketCounts?.critical || 0) + (ticketCounts?.overdue || 0), 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/50')}
          </div>
        </div>

        {/* ITSM Modules */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              ITSM &amp; Resources
            </div>
          )}
          <div className="space-y-1.5">
            {navItem('approvals', 'Approvals Queue', <ShieldAlert className="w-4 h-4" />, ticketCounts?.pendingApprovals, 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/50')}
            {navItem('assets', 'IT Assets & Inventory', <Server className="w-4 h-4" />)}
            {navItem('catalog', 'Service Catalog', <Grid className="w-4 h-4" />)}
            {navItem('kb', 'Knowledge Base', <BookOpen className="w-4 h-4" />)}
            {navItem('reports', 'Reports & SLA Metrics', <BarChart3 className="w-4 h-4" />)}
            {navItem('email-channels', 'Email Gateway', <Mail className="w-4 h-4" />)}
          </div>
        </div>

        {/* Configuration & Administration */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Administration
            </div>
          )}
          <div className="space-y-1.5">
            {navItem('settings', 'Helpdesk Settings', <Settings className="w-4 h-4" />)}
            {navItem('superadmin', 'Superadmin Console', <ShieldCheck className="w-4 h-4" />)}
            {navItem('portal', 'End-User Portal', <ExternalLink className="w-4 h-4" />)}
          </div>
        </div>
      </div>

      {/* Footer toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
