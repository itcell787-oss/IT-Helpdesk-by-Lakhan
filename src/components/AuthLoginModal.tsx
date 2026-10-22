import React, { useState } from 'react';
import {
  X,
  Shield,
  User,
  Lock,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Key,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';

interface AuthLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
  onSwitchToRegister?: () => void;
  onContinueAsGuest?: () => void;
  initialPortalType?: 'user' | 'admin' | 'psk';
}

export const AuthLoginModal: React.FC<AuthLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSwitchToRegister,
  onContinueAsGuest,
  initialPortalType = 'user',
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin' | 'psk'>(initialPortalType);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // PSK Password setup state
  const [pskEmail, setPskEmail] = useState('');
  const [pskKey, setPskKey] = useState('');
  const [pskNewPassword, setPskNewPassword] = useState('');
  const [pskConfirmPassword, setPskConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleTabChange = (tab: 'user' | 'admin' | 'psk') => {
    setActiveTab(tab);
    setError(null);
    setSuccessMsg(null);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your User ID or Email address.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          portalType: activeTab === 'admin' ? 'admin' : 'user',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pskEmail.trim() || !pskKey.trim() || !pskNewPassword.trim()) {
      setError('Please fill in all fields (User ID/Email, Pre-Shared Key, and New Password).');
      return;
    }

    if (pskNewPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (pskNewPassword !== pskConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.setPasswordWithPsk({
        emailOrUserId: pskEmail.trim(),
        psk: pskKey.trim(),
        newPassword: pskNewPassword.trim(),
      });

      setSuccessMsg('✓ Password configured successfully! Authenticating your session...');
      setTimeout(() => {
        onLoginSuccess(data.user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to configure password with Pre-Shared Key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg neu-flat rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-700 p-0.5 shadow-md shadow-cyan-500/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                {activeTab === 'admin' ? (
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                ) : activeTab === 'psk' ? (
                  <Key className="w-5 h-5 text-amber-400" />
                ) : (
                  <User className="w-5 h-5 text-cyan-400" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {activeTab === 'admin'
                  ? 'IT Staff & Administrator Sign In'
                  : activeTab === 'psk'
                  ? 'Set Password with Pre-Shared Key'
                  : 'End-User Portal Sign In'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {activeTab === 'admin'
                  ? 'Access IT Service Desk, Tickets, CMDB Assets & Super Admin'
                  : activeTab === 'psk'
                  ? 'Configure or reset your account password using Super Admin PSK'
                  : 'Submit requests, access service catalog, and track support tickets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 neu-btn rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Portal & Setup Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/70 border border-slate-300 dark:border-white/5">
            <button
              type="button"
              onClick={() => handleTabChange('user')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'user'
                  ? 'neu-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>User Portal</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'neu-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin / Staff</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('psk')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'psk'
                  ? 'neu-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Set via PSK</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        {activeTab === 'psk' ? (
          /* Pre-Shared Key Password Setup Form */
          <form onSubmit={handlePskSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold block mb-0.5">Pre-Shared Key Security Gate</span>
              Enter your assigned User ID or Email along with the Pre-Shared Key provided by the Super Administrator to set your account password.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                User ID or Email Address *
              </label>
              <input
                type="text"
                value={pskEmail}
                onChange={(e) => setPskEmail(e.target.value)}
                placeholder="e.g. lakhan.superadmin@ithelpdesk.com or employee@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pre-Shared Key (PSK) *
              </label>
              <input
                type="password"
                value={pskKey}
                onChange={(e) => setPskKey(e.target.value)}
                placeholder="Enter Pre-Shared Key"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Password *
                </label>
                <input
                  type="password"
                  value={pskNewPassword}
                  onChange={(e) => setPskNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={pskConfirmPassword}
                  onChange={(e) => setPskConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full neu-btn-primary py-2.5 px-5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Verifying Pre-Shared Key...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Activate Password &amp; Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Standard Sign In Form (Clean - No Demo Accounts) */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {activeTab === 'admin' ? 'Admin ID or Staff Work Email' : 'Employee ID or Work Email'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeTab === 'admin'
                      ? 'e.g. lakhan.superadmin@ithelpdesk.com'
                      : 'e.g. yourname@company.com'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => handleTabChange('psk')}
                  className="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  Set Password with PSK
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex-1 neu-btn-primary py-2.5 px-5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {activeTab === 'admin' ? 'Admin Console' : 'User Portal'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {activeTab === 'user' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onContinueAsGuest?.();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 neu-btn rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors cursor-pointer"
                >
                  Submit Guest Ticket (No Login)
                </button>
              )}
            </div>

            {activeTab === 'user' && onSwitchToRegister && (
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  New employee?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToRegister();
                    }}
                    className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Register new account with OTP
                  </button>
                </span>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
