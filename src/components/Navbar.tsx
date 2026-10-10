import React, { useState } from 'react';
import {
  Shield,
  Search,
  Moon,
  Sun,
  Bell,
  UserCheck,
  ChevronDown,
  Layers,
  Sparkles,
  Command,
  ExternalLink,
} from 'lucide-react';
import { User, Organization } from '../types';

interface NavbarProps {
  currentUser: User;
  organization: Organization;
  availableUsers: User[];
  onSwitchUser: (userId: string) => void;
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenCommandPalette: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenNewTicket: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  organization,
  availableUsers,
  onSwitchUser,
  activeView,
  onNavigate,
  onOpenCommandPalette,
  isDark,
  onToggleTheme,
  onOpenNewTicket,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const roleBadgeStyles: Record<string, string> = {
    superadmin: 'text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/60 border-violet-300 dark:border-violet-800/60',
    admin: 'text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800/60',
    manager: 'text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800/60',
    technician: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/60',
    requester: 'text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/60',
    auditor: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/60',
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full neu-flat border-b border-slate-200/90 dark:border-white/10 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element Brand Zone with Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate(currentUser.role === 'requester' ? 'portal' : 'dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-700 p-0.5 shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                IT Helpdesk <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">by Lakhan</span>
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links / Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { id: 'dashboard', label: 'Console' },
            { id: 'tickets', label: 'Tickets' },
            { id: 'assets', label: 'Assets' },
            { id: 'kb', label: 'Knowledge Base' },
          ].map((link) => {
            const isActive = activeView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'neu-btn-primary shadow-xs'
                    : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
                }`}
              >
                {link.label}
              </button>
            );
          })}
          <button
            onClick={() => onNavigate('portal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'portal'
                ? 'neu-btn-primary shadow-xs'
                : 'neu-btn text-cyan-800 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-white'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            End-User Portal
          </button>
        </div>

        {/* Zone 3: Actions & Role Impersonator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Global Search trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 neu-btn rounded-xl transition-all cursor-pointer font-bold"
            title="Search tickets, assets, articles (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded border border-slate-300 dark:border-slate-700 font-bold">⌘K</kbd>
          </button>

          {/* Quick New Ticket button */}
          <button
            onClick={onOpenNewTicket}
            className="neu-btn-primary px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
          >
            + New Ticket
          </button>

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2 neu-btn rounded-xl transition-all cursor-pointer text-slate-800 dark:text-slate-200"
            title="Toggle Theme (Light / Dark)"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-600" />}
          </button>

          {/* User Switcher / Impersonation Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 neu-btn rounded-xl transition-all cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px]">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="font-bold text-slate-900 dark:text-slate-100 max-w-[110px] truncate">{currentUser.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-mono font-bold">{currentUser.role}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 glass-dropdown rounded-xl p-2 z-50 border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Current Profile &amp; Organization</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{currentUser.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{currentUser.email}</div>
                  {currentUser.title && (
                    <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">{currentUser.title}</div>
                  )}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{organization.name}</div>

                  {/* Profile & Mailbox Shortcut */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onNavigate('settings-profile');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800/40 transition-colors flex items-center justify-between"
                    >
                      <span>Edit My Profile (Name, Post, Email)</span>
                      <span className="text-[10px]">⚙</span>
                    </button>
                    {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onNavigate('settings-mailbox');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/40 transition-colors flex items-center justify-between"
                      >
                        <span>My Mailbox (IMAP/POP/SMTP)</span>
                        <span className="text-[10px]">✉</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="py-2">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Switch Test Persona / Role
                  </div>
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u.id);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                        u.id === currentUser.id
                          ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate font-medium">{u.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{u.email}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${roleBadgeStyles[u.role] || ''}`}>
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
