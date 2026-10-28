import React, { useState } from 'react';
import {
  Shield,
  Search,
  Moon,
  Sun,
  ChevronDown,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  KeyRound,
  LayoutDashboard,
  Ticket as TicketIcon,
  Boxes,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { User, Organization } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';

interface NavbarProps {
  currentUser: User | null;
  organization: Organization;
  availableUsers: User[];
  onSwitchUser: (userId: string) => void;
  activeView: string;
  portalTab?: string;
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
  portalTab,
  onNavigate,
  onOpenCommandPalette,
  isDark,
  onToggleTheme,
  onOpenNewTicket: _onOpenNewTicket,
  onOpenLogin,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSignInDropdown, setShowSignInDropdown] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [logoError, setLogoError] = useState(false);

  // If currentUser is null, activeUser is null (guest mode)
  const isGuest = !currentUser;
  const isStaff = Boolean(currentUser && currentUser.role !== 'requester');
  const isRequester = Boolean(currentUser && currentUser.role === 'requester');

  const branding = organization?.branding || {};
  const logoUrl = branding.logoUrl?.trim();
  const productName = branding.productName || 'IT Helpdesk by Lakhan';
  const subtitle = (branding as any).subtitle || 'Enterprise Support';
  const logoTemplate = branding.logoTemplate || 'rectangle';

  React.useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  const roleBadgeStyles: Record<string, string> = {
    superadmin: 'text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/60 border-violet-300 dark:border-violet-800/60',
    admin: 'text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800/60',
    manager: 'text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800/60',
    technician: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/60',
    requester: 'text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/60',
    auditor: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/60',
    inventory_manager: 'text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-800/60',
  };

  // Staff (Superadmin, Admin, Manager, Technician) vs End-User (Requester) vs Guest
  // Users do NOT see Console, Tickets, or Assets & Inventory.
  const navItems = isStaff
    ? [
        { id: 'dashboard', label: 'Console', icon: LayoutDashboard },
        { id: 'tickets', label: 'Tickets', icon: TicketIcon },
        { id: 'assets', label: 'Assets & Inventory', icon: Boxes },
        { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
        { id: 'portal', label: 'End-User Portal', icon: ExternalLink },
      ]
    : isRequester
    ? [
        { id: 'portal', label: 'End-User Portal', icon: ExternalLink },
        { id: 'portal-my-tickets', label: 'My Tickets', icon: TicketIcon },
        { id: 'portal-my-assets', label: 'My Assets', icon: Boxes },
        { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
      ]
    : [
        { id: 'portal', label: 'Guest Portal', icon: ExternalLink },
        { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
      ];

  const userInitial = currentUser ? (currentUser.name || 'U').charAt(0).toUpperCase() : 'G';
  const userRoleFormatted = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Guest';
  const employeeCodeFormatted = currentUser?.employeeCode || (currentUser?.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : '');

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* =========================================================================
            ZONE 1: CUSTOMIZABLE BRAND & LOGO SECTION
            Supports:
             - Round logo (emblems, circular seals, stamps)
             - Square logo (app icons, square crests)
             - Rectangle logo (wide banners, horizontal wordmarks)
             - Any PNG, SVG, JPG format with transparent support
             - Fallback to high-tech Shield icon if no logo or on load error
           ========================================================================= */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate(!currentUser || currentUser.role === 'requester' ? 'portal' : 'dashboard')}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer select-none"
            title={`${productName} · ${subtitle}`}
          >
            {logoUrl && !logoError ? (
              <>
                {/* 1. Round Logo Shape */}
                {logoTemplate === 'round' && (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center p-0.5 shrink-0 ring-2 ring-cyan-500/20 group-hover:scale-105 transition-transform">
                    <img
                      src={logoUrl}
                      alt={productName}
                      className="w-full h-full object-cover rounded-full"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                )}

                {/* 2. Square Logo Shape */}
                {logoTemplate === 'square' && (
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center p-1.5 shrink-0 ring-2 ring-cyan-500/20 group-hover:scale-105 transition-transform">
                    <img
                      src={logoUrl}
                      alt={productName}
                      className="w-full h-full object-contain rounded-lg"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                )}

                {/* 3. Rectangle / Wide Banner Shape */}
                {logoTemplate === 'rectangle' && (
                  <div className="h-10 max-h-11 flex items-center shrink-0 max-w-[210px] sm:max-w-[260px] overflow-hidden p-1 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/10 group-hover:scale-102 transition-transform shadow-2xs">
                    <img
                      src={logoUrl}
                      alt={productName}
                      className="h-full w-auto max-h-9 sm:max-h-10 object-contain"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                )}

                {/* Text stack alongside logo */}
                <div className={`flex flex-col leading-tight ${logoTemplate === 'rectangle' ? 'hidden md:flex pl-2 border-l border-slate-200 dark:border-slate-800' : ''}`}>
                  <span className="font-extrabold text-[15px] sm:text-base tracking-tight text-slate-900 dark:text-white truncate max-w-[220px]">
                    {productName}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase font-mono truncate">
                    {subtitle}
                  </span>
                </div>
              </>
            ) : (
              /* Fallback default high-tech badge */
              <>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-indigo-600 flex items-center justify-center shadow-md text-white shrink-0 ring-1 ring-cyan-400/30 group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[15px] sm:text-base tracking-tight text-slate-900 dark:text-white">
                      {productName.includes('by Lakhan') ? (
                        <>IT Helpdesk <span className="text-cyan-600 dark:text-cyan-400 font-black">by Lakhan</span></>
                      ) : (
                        productName
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-cyan-400/90 uppercase font-mono">
                    {subtitle}
                  </span>
                </div>
              </>
            )}
          </button>
        </div>

        {/* =========================================================================
            ZONE 2: NAVIGATION TABS (Console, Tickets, Assets & Inventory, Knowledge Base, End-User Portal)
           ========================================================================= */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            let isActive = false;
            if (isStaff) {
              isActive =
                activeView === item.id ||
                (item.id === 'tickets' && (activeView === 'ticket-detail' || activeView.startsWith('tickets-')));
            } else {
              if (item.id === 'portal') {
                isActive = activeView === 'portal' && (!portalTab || portalTab === 'home' || portalTab === 'submit' || portalTab === 'register');
              } else if (item.id === 'portal-my-tickets') {
                isActive = (activeView === 'portal' && portalTab === 'my-tickets') || activeView === 'ticket-detail';
              } else if (item.id === 'portal-my-assets') {
                isActive = activeView === 'portal' && portalTab === 'my-assets';
              } else if (item.id === 'kb') {
                isActive = activeView === 'kb' || (activeView === 'portal' && portalTab === 'kb');
              }
            }
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* =========================================================================
            ZONE 3: RIGHT SECTION (Search... ⌘K, Theme, Profile / Lakhan Prajapati CBPL2045)
           ========================================================================= */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Search Bar */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer font-medium shadow-2xs group"
            title="Search tickets, assets, articles (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
            <span className="hidden sm:inline font-medium text-slate-600 dark:text-slate-300">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
            title="Toggle Theme (Light / Dark)"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-600" />}
          </button>

          {/* User Profile Badge or Guest Sign In */}
          {!currentUser ? (
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => onOpenLogin('user')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowSignInDropdown(!showSignInDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                  title="Guest Portal Menu & Demo Switcher"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline">Guest Portal</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>

                {showSignInDropdown && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-88 glass-dropdown rounded-xl p-2 z-50 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 space-y-1.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                        Guest Self-Service
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        You are browsing the Public Helpdesk. No login is needed to create tickets or track issues.
                      </p>
                      <div className="pt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            setShowSignInDropdown(false);
                            onOpenLogin('user');
                          }}
                          className="w-full text-center py-1.5 px-2 rounded-lg text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 cursor-pointer"
                        >
                          Employee Login
                        </button>
                        <button
                          onClick={() => {
                            setShowSignInDropdown(false);
                            onOpenLogin('admin');
                          }}
                          className="w-full text-center py-1.5 px-2 rounded-lg text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 cursor-pointer"
                        >
                          Staff / Admin Login
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                {/* Avatar circle with 'L' */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs ring-2 ring-cyan-500/20 shadow-xs shrink-0">
                  {userInitial}
                </div>

                {/* Stacked Profile Name & Superadmin CBPL2045 */}
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 max-w-[150px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                    {userRoleFormatted} {employeeCodeFormatted}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 glass-dropdown rounded-xl p-2 z-50 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100vh-5rem)] flex flex-col overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 space-y-1.5 shrink-0">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Signed In As</div>
                    <div className="bg-cyan-50 dark:bg-cyan-950/60 p-2.5 rounded-xl border border-cyan-300/80 dark:border-cyan-800/50 space-y-1">
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-white break-words leading-tight flex items-center justify-between">
                        <span>{currentUser.name}</span>
                        <span className="px-1.5 py-0.5 text-[9px] rounded font-bold uppercase bg-cyan-600 text-white">
                          {userRoleFormatted}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-cyan-800 dark:text-cyan-300 break-words">
                        {currentUser.email}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Employee ID: {employeeCodeFormatted}
                      </div>
                    </div>

                    {currentUser.title && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{currentUser.title}</div>
                    )}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{organization.name}</div>

                    {/* Profile & Settings Shortcuts */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/40 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Change Password</span>
                        </span>
                        <span className="text-[10px] font-mono">🔑</span>
                      </button>

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
