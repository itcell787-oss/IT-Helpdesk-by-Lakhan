import React, { useState } from 'react';
import {
  Shield,
  Search,
  Moon,
  Sun,
  ChevronDown,
  ExternalLink,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Settings,
  Mail,
  UserCheck,
  KeyRound,
  Grid,
  BookOpen,
} from 'lucide-react';
import { User, Organization } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';

interface NavbarProps {
  currentUser: User | null;
  organization: Organization;
  availableUsers: User[];
  onSwitchUser: (userId: string) => void;
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenCommandPalette: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenNewTicket: () => void;
  onOpenLogin: (type?: 'user' | 'admin') => void;
  onLogout: () => void;
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
  onOpenLogin,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSignInDropdown, setShowSignInDropdown] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  React.useEffect(() => {
    setLogoError(false);
  }, [organization.branding?.logoUrl]);

  const isStaff = currentUser && currentUser.role !== 'requester';

  const logoTemplate = organization.branding?.logoTemplate || 'rectangle';
  const logoWidth = organization.branding?.logoWidth || 200;
  const logoHeight = organization.branding?.logoHeight || 80;

  const shapeClass =
    logoTemplate === 'round'
      ? 'rounded-full aspect-square'
      : logoTemplate === 'square'
      ? 'rounded-none aspect-square'
      : 'rounded-xl';

  const roleBadgeStyles: Record<string, string> = {
    superadmin: 'text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/60 border-violet-300 dark:border-violet-800/60',
    admin: 'text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800/60',
    manager: 'text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800/60',
    technician: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/60',
    requester: 'text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/60',
    auditor: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/60',
  };

  return (
    <header className="sticky top-0 z-40 min-h-[88px] sm:min-h-[96px] py-2 w-full neu-flat border-b border-slate-200/90 dark:border-white/10 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Zone with Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate(isStaff ? 'dashboard' : 'portal')}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          >
            {!logoError && organization.branding?.logoUrl ? (
              <div
                style={{
                  width: `${logoWidth}px`,
                  height: `${logoHeight}px`,
                  maxWidth: '220px',
                  maxHeight: '85px',
                }}
                className={`overflow-hidden flex items-center justify-center p-1 bg-white/40 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 shadow-xs transition-transform group-hover:scale-[1.01] ${shapeClass}`}
              >
                <img
                  src={organization.branding.logoUrl}
                  alt={organization.branding.productName || 'Organization Logo'}
                  className={`w-full h-full ${
                    logoTemplate === 'round' || logoTemplate === 'square'
                      ? 'object-cover'
                      : 'object-contain'
                  } ${
                    logoTemplate === 'round'
                      ? 'rounded-full'
                      : logoTemplate === 'square'
                      ? 'rounded-none'
                      : 'rounded-lg'
                  }`}
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div
                style={{
                  width: `${logoWidth}px`,
                  height: `${logoHeight}px`,
                  maxWidth: '220px',
                  maxHeight: '85px',
                }}
                className={`shrink-0 bg-gradient-to-br from-cyan-500/20 via-sky-600/20 to-indigo-700/20 p-1 border border-cyan-500/30 flex items-center justify-center gap-2 group-hover:scale-[1.01] transition-transform ${shapeClass}`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shadow-md shrink-0">
                  <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
                </div>
                {logoWidth >= 120 && (
                  <div className="flex flex-col truncate leading-tight">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                      {organization.branding?.productName || 'Apex Desk'}
                    </span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
                      Enterprise Support
                    </span>
                  </div>
                )}
              </div>
            )}

            {(logoTemplate === 'round' || logoTemplate === 'square' || logoWidth < 140) && (
              <div className="hidden sm:block shrink-0">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                  {organization.branding?.productName || 'IT Helpdesk'}{' '}
                  {!organization.branding?.productName && (
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">by Lakhan</span>
                  )}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          {isStaff ? (
            <>
              {[
                { id: 'dashboard', label: 'Console' },
                { id: 'tickets', label: 'Tickets' },
                { id: 'assets', label: 'Assets & Inventory' },
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
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('portal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'portal'
                    ? 'neu-btn-primary shadow-xs'
                    : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
                }`}
              >
                Service Portal
              </button>
              <button
                onClick={() => onNavigate('kb')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'kb'
                    ? 'neu-btn-primary shadow-xs'
                    : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Knowledge Base
              </button>
              {/* Service Catalog is ONLY visible to logged-in requesters (hidden for unauthenticated guests) */}
              {currentUser && (
                <button
                  onClick={() => onNavigate('catalog')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeView === 'catalog'
                      ? 'neu-btn-primary shadow-xs'
                      : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  Service Catalog
                </button>
              )}
            </>
          )}
        </div>

        {/* Zone 3: Actions & Sign In on Right Hand Side */}
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


          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2 neu-btn rounded-xl transition-all cursor-pointer text-slate-800 dark:text-slate-200"
            title="Toggle Theme (Light / Dark)"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-600" />}
          </button>

          {/* Right Hand Side Auth: Sign In or User Profile */}
          {!currentUser ? (
            /* Unauthenticated Guest: Prominent Sign In Options */
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenLogin('user')}
                  className="neu-btn-primary px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => setShowSignInDropdown(!showSignInDropdown)}
                  className="p-2 neu-btn rounded-xl text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors cursor-pointer"
                  title="Choose Login Portal (User vs Admin)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {showSignInDropdown && (
                <div className="absolute right-0 mt-2 w-64 glass-dropdown rounded-xl p-2 z-50 border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 mb-1">
                    Select Login Portal
                  </div>
                  <button
                    onClick={() => {
                      setShowSignInDropdown(false);
                      onOpenLogin('user');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-left text-slate-800 dark:text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-600 transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-cyan-500" />
                    <div>
                      <div className="font-bold">User Portal Sign In</div>
                      <div className="text-[10px] text-slate-500">For Requesters &amp; Employees</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowSignInDropdown(false);
                      onOpenLogin('admin');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-left text-slate-800 dark:text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-600 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-bold">Admin &amp; Staff Login</div>
                      <div className="text-[10px] text-slate-500">For IT Staff, Technicians, Admins</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Authenticated User: Profile Dropdown & Persona Switcher */
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 neu-btn rounded-xl transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px]">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="font-bold text-slate-900 dark:text-slate-100 max-w-[150px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold">
                    {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} {currentUser.employeeCode || (currentUser.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1001')}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 glass-dropdown rounded-xl p-2 z-50 border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100vh-5rem)] flex flex-col overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 space-y-1.5 shrink-0">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Signed In As</div>
                    <div className="bg-cyan-100/60 dark:bg-cyan-950/60 p-2.5 rounded-xl border border-cyan-300 dark:border-cyan-800/50 space-y-1">
                      <div className="text-xs font-mono font-extrabold text-slate-900 dark:text-white break-words leading-tight">
                        {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} {currentUser.employeeCode || (currentUser.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1001')} {currentUser.name}
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-cyan-800 dark:text-cyan-300 break-words">
                        {currentUser.email}
                      </div>
                    </div>
                    {currentUser.title && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{currentUser.title}</div>
                    )}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{organization.name}</div>

                    {/* Profile & Settings Shortcuts */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-1">
                      {/* In-app Change Password button for any logged-in user */}
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/40 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Change Password</span>
                        </span>
                        <span className="text-[10px] font-mono">🔑</span>
                      </button>

                      {isStaff && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onNavigate('settings-profile');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800/40 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Edit My Profile</span>
                          <span className="text-[10px]">⚙</span>
                        </button>
                      )}
                      {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onNavigate('settings-mailbox');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/40 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>My Mailbox (IMAP/POP/SMTP)</span>
                          <span className="text-[10px]">✉</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/40 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Switch Persona / Role for Testing - SCROLLABLE PANE */}
                  <div className="py-2 flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
                      <span>Switch Active Persona ({availableUsers.length})</span>
                      <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">Scroll Down ↓</span>
                    </div>
                    <div className="overflow-y-auto max-h-64 sm:max-h-72 custom-scrollbar space-y-0.5 px-1 overscroll-contain">
                      {availableUsers.map((u) => {
                        const code = u.employeeCode || (u.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010');
                        return (
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
                              <span className="truncate font-bold">[{code}]{u.name}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{u.email}</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase shrink-0 border ${roleBadgeStyles[u.role] || ''}`}>
                              {u.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={currentUser}
        />
      )}
    </header>
  );
};
