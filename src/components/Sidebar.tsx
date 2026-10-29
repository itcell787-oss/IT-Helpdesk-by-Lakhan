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
import { UserRole, AdminPrivileges } from '../types';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userRole: UserRole;
  userPrivileges?: AdminPrivileges;
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
  userPrivileges,
  collapsed,
  onToggleCollapse,
  ticketCounts,
}) => {
  const isRequester = userRole === 'requester';

  // Helper to determine if a left pane view is permitted for this staff user
  const isViewPermitted = (viewKey: string, defaultPermitted: boolean) => {
    if (userRole === 'superadmin') return true;
    if (!userPrivileges) return defaultPermitted;

    if (viewKey === 'dashboard') {
      if (userPrivileges.canViewDashboard !== undefined) return userPrivileges.canViewDashboard;
      if (Array.isArray(userPrivileges.allowedViews)) return userPrivileges.allowedViews.includes('dashboard');
      return defaultPermitted;
    }
    if (viewKey === 'tickets') {
      if (userPrivileges.canViewTickets !== undefined) return userPrivileges.canViewTickets;
      if (Array.isArray(userPrivileges.allowedViews)) return userPrivileges.allowedViews.includes('tickets');
      if (userPrivileges.canManageTickets !== undefined) return userPrivileges.canManageTickets;
      return defaultPermitted;
    }
    if (viewKey === 'assets') {
      if (userPrivileges.canViewAssets !== undefined) return userPrivileges.canViewAssets;
      if (Array.isArray(userPrivileges.allowedViews)) return userPrivileges.allowedViews.includes('assets');
      if (userPrivileges.canManageAssets !== undefined) return userPrivileges.canManageAssets;
      return defaultPermitted;
    }
    if (viewKey === 'approvals') {
      if (userPrivileges.canViewApprovals !== undefined) return userPrivileges.canViewApprovals;
      if (Array.isArray(userPrivileges.allowedViews)) return userPrivileges.allowedViews.includes('approvals');
      if (userPrivileges.canManageApprovals !== undefined) return userPrivileges.canManageApprovals;
      return defaultPermitted;
    }
    if (viewKey === 'reports') {
      if (userPrivileges.canViewReports !== undefined) return userPrivileges.canViewReports;
      if (Array.isArray(userPrivileges.allowedViews)) return userPrivileges.allowedViews.includes('reports');
      return defaultPermitted;
    }

    if (Array.isArray(userPrivileges.allowedViews)) {
      return userPrivileges.allowedViews.includes(viewKey);
    }
    return defaultPermitted;
  };

  const navItem = (
    id: string,
    label: string,
    icon: React.ReactNode,
    badge?: number,
    badgeColor: string = 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/50',
    hasNotificationDot?: boolean
  ) => {
    const isActive = activeView === id;

    if (collapsed) {
      return (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`w-full h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all group cursor-pointer relative ${
            isActive
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
          title={label}
          aria-label={label}
        >
          <span
            className={`shrink-0 flex items-center justify-center w-5 h-5 ${
              isActive ? 'text-white' : 'text-cyan-700 dark:text-cyan-400 group-hover:scale-110 transition-transform'
            }`}
          >
            {icon}
          </span>
          {badge !== undefined && badge > 0 && (
            <span
              className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full font-mono text-[9px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md ${
                hasNotificationDot ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white animate-pulse' : 'bg-cyan-600 text-white'
              }`}
              title={`${badge} open tickets`}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>
      );
    }

    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all group cursor-pointer ${
          isActive
            ? 'neu-btn-primary shadow-xs'
            : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
        }`}
        title={label}
        aria-label={label}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          <span
            className={`shrink-0 flex items-center justify-center w-5 h-5 ${
              isActive ? 'text-white' : 'text-cyan-700 dark:text-cyan-400 group-hover:scale-105 transition-transform'
            }`}
          >
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {hasNotificationDot ? (
              <span className="relative inline-flex items-center justify-center" title={`${badge} Total Open Tickets`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-extrabold font-mono text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-md border border-cyan-300/80 dark:border-cyan-400/60">
                  {badge > 99 ? '99+' : badge}
                </span>
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold shrink-0 shadow-xs ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : badgeColor
                }`}
              >
                {badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`h-full neu-flat border-r border-slate-200/90 dark:border-white/10 transition-all duration-300 flex flex-col justify-between shrink-0 z-30 select-none overflow-hidden sticky top-0 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${collapsed ? 'px-2 py-3 space-y-4' : 'p-3 space-y-5'}`}>
        {/* Main Workspaces (Controlled by staff privileges) */}
        {(isViewPermitted('dashboard', userRole !== 'inventory_manager') || isViewPermitted('tickets', userRole !== 'inventory_manager' || userPrivileges?.canManageTickets === true)) && (
          <div>
            {!collapsed ? (
              <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Service Desk
              </div>
            ) : (
              <div className="w-6 h-0.5 bg-slate-300 dark:bg-white/10 mx-auto mb-2 rounded-full" />
            )}
            <div className="space-y-1.5">
              {isViewPermitted('dashboard', userRole !== 'inventory_manager') && navItem('dashboard', 'Operations Dashboard', <LayoutDashboard className="w-4 h-4" />)}
              {isViewPermitted('tickets', userRole !== 'inventory_manager' || userPrivileges?.canManageTickets === true) && (
                <>
                  {navItem('tickets', 'All Tickets', <TicketIcon className="w-4 h-4" />, ticketCounts?.all)}
                  {navItem('tickets-my', 'Open Tickets', <Inbox className="w-4 h-4" />, ticketCounts?.open, 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/50', true)}
                  {navItem('tickets-unassigned', 'Unassigned Queue', <Clock className="w-4 h-4" />, ticketCounts?.unassigned, 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50')}
                  {navItem('tickets-critical', 'Critical & Overdue', <AlertOctagon className="w-4 h-4" />, (ticketCounts?.critical || 0) + (ticketCounts?.overdue || 0), 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/50')}
                </>
              )}
            </div>
          </div>
        )}

        {/* ITSM Modules */}
        <div>
          {!collapsed ? (
            <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              ITSM &amp; Resources
            </div>
          ) : (
            <div className="w-6 h-0.5 bg-slate-300 dark:bg-white/10 mx-auto my-2 rounded-full" />
          )}
          <div className="space-y-1.5">
            {isViewPermitted('approvals', userRole !== 'inventory_manager' && userRole !== 'requester') && navItem('approvals', 'Approvals Queue', <ShieldAlert className="w-4 h-4" />, ticketCounts?.pendingApprovals, 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/50')}
            {isViewPermitted('assets', true) && navItem('assets', 'IT Assets & Inventory', <Server className="w-4 h-4" />)}
            {navItem('catalog', 'Service Catalog', <Grid className="w-4 h-4" />)}
            {navItem('kb', 'Knowledge Base', <BookOpen className="w-4 h-4" />)}
            {isViewPermitted('reports', userRole === 'superadmin' || userRole === 'admin' || userRole === 'technician') && navItem('reports', 'Reports & SLA Metrics', <BarChart3 className="w-4 h-4" />)}
            {(userRole === 'superadmin' || userRole === 'admin') && navItem('email-channels', 'Email Gateway', <Mail className="w-4 h-4" />)}
          </div>
        </div>

        {/* Configuration & Administration */}
        <div>
          {!collapsed ? (
            <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Administration
            </div>
          ) : (
            <div className="w-6 h-0.5 bg-slate-300 dark:bg-white/10 mx-auto my-2 rounded-full" />
          )}
          <div className="space-y-1.5">
            {navItem('settings', 'Helpdesk Settings', <Settings className="w-4 h-4" />)}
            {userRole === 'superadmin' && navItem('superadmin', 'Superadmin Console', <ShieldCheck className="w-4 h-4" />)}
            {navItem('portal', 'End-User Portal', <ExternalLink className="w-4 h-4" />)}
          </div>
        </div>
      </div>

      {/* Footer toggle */}
      <div className={`p-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-center`}>
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
};
