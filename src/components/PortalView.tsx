import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  PlusCircle,
  FileText,
  Search,
  BookOpen,
  Grid,
  CheckCircle,
  Clock,
  Send,
  Star,
  Shield,
  HelpCircle,
  KeyRound,
  CheckCircle2,
  Lock,
  UserPlus,
  Check,
} from 'lucide-react';
import { Ticket, KnowledgeArticle, ServiceCatalogItem, User, CustomFieldDefinition } from '../types';
import { api } from '../services/api';

interface PortalViewProps {
  currentUser: User;
  tickets: Ticket[];
  knowledgeArticles: KnowledgeArticle[];
  serviceCatalog: ServiceCatalogItem[];
  customFields: CustomFieldDefinition[];
  onOpenNewTicket: () => void;
  onSelectTicket: (ticketId: string) => void;
  onNavigateToCatalog: () => void;
  onNavigateToKb: () => void;
  onSubmitSurvey: (ticketId: string, rating: number, comment?: string) => void;
  onSubmitTicket: (data: any) => Promise<any>;
  onUserRegistered?: (user: User) => void;
  initialTab?: string;
}

export const PortalView: React.FC<PortalViewProps> = ({
  currentUser,
  tickets,
  knowledgeArticles,
  serviceCatalog,
  customFields,
  onOpenNewTicket,
  onSelectTicket,
  onNavigateToCatalog,
  onNavigateToKb,
  onSubmitSurvey,
  onSubmitTicket,
  onUserRegistered,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'submit' | 'my-tickets' | 'kb' | 'register'>(
    (initialTab as any) || 'home'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingTicketId, setRatingTicketId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  // User Self-Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regDepartment, setRegDepartment] = useState('Operations');
  const [regPhone, setRegPhone] = useState('');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpVerified, setRegOtpVerified] = useState(false);
  const [regOtpLoading, setRegOtpLoading] = useState(false);
  const [regOtpPreview, setRegOtpPreview] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);

  // In-Page Ticket Submission State
  const [submitEmail, setSubmitEmail] = useState(currentUser.email);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState('Software & Cloud Apps');
  const [formPriority, setFormPriority] = useState('normal');
  const [formDescription, setFormDescription] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Tickets belonging to current user
  const myTickets = tickets.filter(
    (t) => t.requesterId === currentUser.id || t.requesterEmail === currentUser.email
  );

  // Check stored OTP verification for user email and URL tab parameter
  useEffect(() => {
    const verified = sessionStorage.getItem(`otp_verified_${currentUser.email}`);
    if (verified === 'true') {
      setIsOtpVerified(true);
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'register' || tabParam === 'submit' || tabParam === 'my-tickets') {
        setActiveTab(tabParam as any);
      }
    }
  }, [currentUser.email]);

  const handleSendRegOtp = async () => {
    if (!regEmail || !regEmail.includes('@')) {
      setRegError('Please enter a valid work email address.');
      return;
    }
    setRegOtpLoading(true);
    setRegError(null);
    try {
      const res = await api.sendOtp(regEmail);
      setRegOtpSent(true);
      setRegOtpPreview(res.previewCode);
    } catch (err: any) {
      setRegError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleVerifyRegOtp = async () => {
    if (!regOtpCode || regOtpCode.length !== 6) {
      setRegError('Please enter the 6-digit confirmation code.');
      return;
    }
    setRegOtpLoading(true);
    setRegError(null);
    try {
      const res = await api.verifyOtp(regEmail, regOtpCode);
      if (res.verified) {
        setRegOtpVerified(true);
        sessionStorage.setItem(`otp_verified_${regEmail}`, 'true');
      }
    } catch (err: any) {
      setRegError('Incorrect confirmation code. Please check and try again.');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    if (!regOtpVerified) {
      setRegError('Email verification required before registering.');
      return;
    }
    setRegSubmitting(true);
    setRegError(null);
    try {
      const res = await api.registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        title: regTitle.trim(),
        phone: regPhone.trim(),
        organizationId: currentUser.organizationId,
      });
      const registeredUser = res.user;
      setRegSuccess(`Account created successfully! Welcome to the portal, ${registeredUser.name}.`);
      onUserRegistered?.(registeredUser);
      setSubmitEmail(registeredUser.email);
      setIsOtpVerified(true);
      setTimeout(() => {
        setActiveTab('submit');
        setRegSuccess(null);
      }, 1500);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!submitEmail || !submitEmail.includes('@')) {
      setOtpError('Please enter a valid email address.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const res = await api.sendOtp(submitEmail);
      setOtpSent(true);
      setOtpMessage(res.message);
      setOtpPreview(res.previewCode);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit code received.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await api.verifyOtp(submitEmail, otpCode);
      if (res.verified) {
        setIsOtpVerified(true);
        setOtpMessage('✓ Email verified! You can now submit your request.');
        sessionStorage.setItem(`otp_verified_${submitEmail}`, 'true');
      }
    } catch (err: any) {
      setOtpError('Incorrect code. Please check and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formDescription.trim()) return;

    if (!isOtpVerified) {
      setOtpError('Email confirmation required before ticket submission.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitTicket({
        subject: formSubject,
        description: formDescription,
        category: formCategory,
        priority: formPriority,
        type: 'incident',
        channel: 'portal',
        requesterId: currentUser.id,
        requesterName: currentUser.name,
        requesterEmail: submitEmail || currentUser.email,
        customFields: customValues,
        otpVerified: true,
      });

      setSubmitSuccess('✓ Your ticket has been logged and assigned to the IT Service Desk!');
      setTimeout(() => {
        setSubmitSuccess(null);
        setFormSubject('');
        setFormDescription('');
        setActiveTab('my-tickets');
      }, 2000);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingTicketId) return;
    onSubmitSurvey(ratingTicketId, selectedRating, surveyComment);
    setSurveySubmitted(true);
    setTimeout(() => {
      setRatingTicketId(null);
      setSurveySubmitted(false);
      setSurveyComment('');
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Portal Hero Header */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 sm:p-8 border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-cyan-950/40 text-center sm:text-left">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              IT Self-Service Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              How can IT support assist you today, {currentUser.name.split(' ')[0]}?
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Submit support tickets, request hardware &amp; software, track open requests, or browse step-by-step guides.
            </p>
          </div>

          <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('submit')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-cyan-900/40 transition-all cursor-pointer text-center"
            >
              + Submit a Support Ticket
            </button>
            <button
              onClick={() => setActiveTab('my-tickets')}
              className="px-5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-center"
            >
              View My Requests ({myTickets.length})
            </button>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="neu-flat p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
        >
          Portal Overview
        </button>
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'submit'
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" /> Submit Support Ticket
        </button>
        <button
          onClick={() => setActiveTab('my-tickets')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'my-tickets'
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
        >
          My Tickets ({myTickets.length})
        </button>
        <button
          onClick={() => setActiveTab('kb')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'kb'
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Help Knowledge Base
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'register'
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Self-Register Account
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* 4 Feature Service Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab('submit')}
              className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-cyan-500/50 cursor-pointer space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Report an Issue</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Lodge a bug, computer failure, network glitch, or urgent outage.
              </p>
            </div>

            <div
              onClick={onNavigateToCatalog}
              className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-indigo-500/50 cursor-pointer space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Grid className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Service Catalog</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Order a laptop, software license, AWS role, or VPN access.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('my-tickets')}
              className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/50 cursor-pointer space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Track Requests</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Check status of your open tickets and reply directly to IT staff.
              </p>
            </div>

            <div
              onClick={onNavigateToKb}
              className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-amber-500/50 cursor-pointer space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Browse Guides</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Search verified solutions for VPN, passwords, and Outlook issues.
              </p>
            </div>
          </div>

          {/* Quick FAQ / Popular Articles */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Common IT Support Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {knowledgeArticles.slice(0, 4).map((art) => (
                <div
                  key={art.id}
                  onClick={onNavigateToKb}
                  className="p-3.5 rounded-xl neu-card hover:bg-cyan-50/70 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/5 cursor-pointer transition-colors space-y-1"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 hover:text-cyan-600 dark:hover:text-cyan-300">
                    {art.title}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{art.category}</span>
                    <span>·</span>
                    <span>{art.helpfulCount} people found this helpful</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Submit Support Ticket with OTP Confirmation Flow */}
      {activeTab === 'submit' && (
        <div className="neu-flat p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-white/10 max-w-2xl mx-auto space-y-6">
          <div className="space-y-1 pb-3 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Submit IT Service Request
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Please confirm your email address via the 6-digit OTP code before submitting.
            </p>
          </div>

          {submitSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              {submitSuccess}
            </div>
          )}

          {/* STEP 1: Mandatory OTP Email Confirmation */}
          {!isOtpVerified ? (
            <div className="p-5 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Step 1: Confirm Your Email Address
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                To guarantee ticket delivery and security, normal users must verify their email with a 6-digit code.
              </p>

              {otpError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-semibold">
                  {otpError}
                </div>
              )}

              {otpMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs space-y-1 font-medium">
                  <div>{otpMessage}</div>
                  {otpPreview && (
                    <div className="font-mono font-bold text-amber-800 dark:text-amber-300 text-xs">
                      [Demo / Test OTP Code: {otpPreview}]
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={submitEmail}
                  onChange={(e) => {
                    setSubmitEmail(e.target.value);
                    setOtpSent(false);
                  }}
                  disabled={otpSent}
                  className="flex-1 px-3.5 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60 font-semibold focus:outline-none"
                />
                {!otpSent ? (
                  <button
                    type="button"
                    disabled={otpLoading}
                    onClick={handleSendOtp}
                    className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    {otpLoading ? 'Sending...' : 'Send 6-Digit OTP'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="neu-btn px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                  >
                    Change Email
                  </button>
                )}
              </div>

              {otpSent && (
                <div className="flex items-center gap-2 pt-2 animate-in fade-in">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-36 px-3 py-2 text-xs neu-input border-amber-400 rounded-xl text-amber-800 dark:text-amber-300 font-mono tracking-widest text-center font-bold"
                  />
                  <button
                    type="button"
                    disabled={otpLoading}
                    onClick={handleVerifyOtp}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl cursor-pointer shadow-sm"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Email Confirmed &amp; Verified: <strong className="font-mono text-slate-900 dark:text-white">{submitEmail}</strong>
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOtpVerified(false);
                  setOtpSent(false);
                  setOtpCode('');
                  setOtpMessage(null);
                  sessionStorage.removeItem(`otp_verified_${submitEmail}`);
                }}
                className="text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer ml-3 font-bold"
              >
                Change Email
              </button>
            </div>
          )}

          {/* STEP 2: Ticket Form (Only unlocked once email is confirmed via OTP) */}
          {/* STEP 2: Ticket Form (Only unlocked once email is confirmed via OTP) */}
          {!isOtpVerified ? (
            <div className="p-8 rounded-2xl neu-card text-center space-y-3 border border-slate-200/90 dark:border-white/10">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400">
                <Lock className="w-6 h-6 text-amber-500 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Step 2: Ticket Form Locked</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto">
                Normal users must first enter their email address and confirm the 6-digit OTP code in Step 1 above. Once verified, the full ticket form and dynamic fields will automatically unlock for submission.
              </p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                >
                  <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                  <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                  <option value="Network & Connectivity">Network &amp; Connectivity</option>
                  <option value="Security & Access">Security &amp; Access</option>
                  <option value="User Accounts & Access">User Accounts &amp; Access</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Urgency / Priority *</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                >
                  <option value="low">Low (General Query)</option>
                  <option value="normal">Normal (Routine Incident)</option>
                  <option value="high">High (Impacting Daily Work)</option>
                  <option value="critical">Critical (Complete Workstation/Service Outage)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Subject / Summary *</label>
              <input
                type="text"
                required
                placeholder="e.g. Outlook indexing freeze or Wi-Fi certificate error"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Problem Description *</label>
              <textarea
                rows={4}
                required
                placeholder="Please describe what happened, steps to reproduce, and any error message..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full p-3 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>

            {/* Dynamic Custom Fields Marked Visible to Portal */}
            {customFields.filter((f) => f.visibleOnPortal && f.enabled !== false).length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                  Additional Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customFields
                    .filter((f) => f.visibleOnPortal && f.enabled !== false)
                    .map((field) => {
                      if (field.conditionalRule) {
                        let cur = '';
                        if (field.conditionalRule.dependsOnField === 'category') cur = formCategory;
                        else if (field.conditionalRule.dependsOnField === 'priority') cur = formPriority;
                        else cur = customValues[field.conditionalRule.dependsOnField] || '';

                        const match =
                          field.conditionalRule.operator === 'equals'
                            ? cur === field.conditionalRule.value
                            : cur !== field.conditionalRule.value;
                        if (!match) return null;
                      }

                      return (
                        <div key={field.id}>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            {field.label} {field.required ? '*' : ''}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              required={field.required}
                              value={customValues[field.name] || ''}
                              onChange={(e) =>
                                setCustomValues({ ...customValues, [field.name]: e.target.value })
                              }
                              className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                            >
                              <option value="">Choose an option...</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              required={field.required}
                              rows={2}
                              placeholder={field.placeholder || ''}
                              value={customValues[field.name] || ''}
                              onChange={(e) =>
                                setCustomValues({ ...customValues, [field.name]: e.target.value })
                              }
                              className="w-full p-2.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                            />
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              required={field.required}
                              placeholder={field.placeholder || field.description || ''}
                              value={customValues[field.name] || ''}
                              onChange={(e) =>
                                setCustomValues({ ...customValues, [field.name]: e.target.value })
                              }
                              className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                            />
                          )}
                          {field.description && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">{field.description}</div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end">
              <button
                type="submit"
                disabled={!isOtpVerified || submitting}
                className="neu-btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting Request...' : 'Submit Support Ticket'}
              </button>
            </div>
          </form>
        )}
        </div>
      )}

      {/* Tab 3: My Tickets List */}
      {activeTab === 'my-tickets' && (
        <div className="space-y-4">
          <div className="neu-card rounded-2xl border border-slate-200/90 dark:border-white/10 divide-y divide-slate-200/90 dark:divide-white/5 overflow-hidden">
            {myTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-600 dark:text-slate-400 font-medium space-y-3">
                <p>You have not submitted any tickets yet.</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Create Your First Ticket
                </button>
              </div>
            ) : (
              myTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 hover:bg-cyan-50/70 dark:hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 cursor-pointer" onClick={() => onSelectTicket(t.id)}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold tabular-nums">{t.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{t.category}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] font-medium">
                        Updated {new Date(t.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.subject}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{t.description}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="capitalize text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200">
                      {t.status.replace(/_/g, ' ')}
                    </span>

                    {/* CSAT Survey trigger if resolved */}
                    {t.status === 'resolved' && (
                      <button
                        onClick={() => setRatingTicketId(t.id)}
                        className="px-3 py-1 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 rounded-lg flex items-center gap-1 transition-colors font-bold cursor-pointer"
                      >
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Rate Support
                      </button>
                    )}

                    <button
                      onClick={() => onSelectTicket(t.id)}
                      className="neu-btn px-3 py-1.5 text-xs text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-bold rounded-lg cursor-pointer"
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Knowledge Base View */}
      {activeTab === 'kb' && (
        <div className="space-y-4">
          <div className="neu-flat p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-cyan-600 dark:text-cyan-400" />
              <input
                type="text"
                placeholder="Search self-help troubleshooting guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeArticles
              .filter(
                (a) =>
                  !searchQuery ||
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.content.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((art) => (
                <div key={art.id} className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-2">
                  <div className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 font-bold uppercase">{art.category}</div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{art.title}</h3>
                  <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                    {art.content}
                  </div>
                  <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-200/80 dark:border-white/5 font-medium">
                    <span>Helpful score: {art.helpfulCount}</span>
                    <button
                      onClick={onNavigateToKb}
                      className="text-cyan-700 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
                    >
                      Read full article
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 5: User Self-Registration with OTP Verification */}
      {activeTab === 'register' && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 max-w-xl mx-auto space-y-6">
          <div className="space-y-1 pb-4 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Employee Self-Registration Portal
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Register yourself to submit and track IT support tickets. Email verification is mandatory via a 6-digit OTP code.
            </p>
          </div>

          {regSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {regSuccess}
            </div>
          )}

          {regError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs">
              {regError}
            </div>
          )}

          {/* STEP 1: Verify Email with OTP */}
          {!regOtpVerified ? (
            <div className="p-4.5 rounded-xl border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">
                <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Step 1: Verify Your Email Address
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Enter your official work email. A 6-digit verification code will be dispatched to verify your mailbox.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setRegOtpSent(false);
                  }}
                  disabled={regOtpSent}
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                {!regOtpSent ? (
                  <button
                    type="button"
                    disabled={regOtpLoading}
                    onClick={handleSendRegOtp}
                    className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {regOtpLoading ? 'Dispatching...' : 'Send Verification OTP'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRegOtpSent(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    Change Email
                  </button>
                )}
              </div>

              {regOtpSent && (
                <div className="pt-2 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value)}
                      className="w-36 px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-cyan-500/60 rounded-xl text-cyan-700 dark:text-cyan-300 font-mono tracking-widest text-center font-bold"
                    />
                    <button
                      type="button"
                      disabled={regOtpLoading}
                      onClick={handleVerifyRegOtp}
                      className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl cursor-pointer"
                    >
                      {regOtpLoading ? 'Checking...' : 'Verify OTP'}
                    </button>
                  </div>
                  {regOtpPreview && (
                    <div className="text-[11px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-100/60 dark:bg-cyan-950/60 p-2 rounded-lg border border-cyan-300 dark:border-cyan-800/40">
                      OTP Code for testing: <strong>{regOtpPreview}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Email Confirmed &amp; Verified: <strong className="font-mono text-slate-900 dark:text-white">{regEmail}</strong>
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setRegOtpVerified(false);
                  setRegOtpSent(false);
                  setRegOtpCode('');
                }}
                className="text-[11px] underline text-emerald-700 dark:text-emerald-400 hover:opacity-80"
              >
                Change
              </button>
            </div>
          )}

          {/* STEP 2: Profile Details */}
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Step 2: Profile &amp; Department Information
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Post / Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Financial Analyst, Software Engineer"
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  <option value="Operations">Operations</option>
                  <option value="Engineering">Engineering &amp; Dev</option>
                  <option value="Sales & Marketing">Sales &amp; Marketing</option>
                  <option value="Finance & Accounting">Finance &amp; Accounting</option>
                  <option value="Human Resources">Human Resources (HR)</option>
                  <option value="Legal & Compliance">Legal &amp; Compliance</option>
                  <option value="Customer Success">Customer Success</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 012-3456"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                You will be immediately logged in to submit support tickets.
              </span>
              <button
                type="submit"
                disabled={!regOtpVerified || regSubmitting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {regSubmitting ? (
                  'Creating Account...'
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Complete Registration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Survey Modal */}
      {ratingTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md neu-modal p-6 rounded-2xl border border-slate-200/90 dark:border-white/15 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              How was your IT support experience?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Ticket <strong className="font-mono text-cyan-700 dark:text-cyan-400">{ratingTicketId}</strong> has been solved. Please share your rating to help us maintain high service quality.
            </p>

            {surveySubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs text-center font-bold">
                Thank you! Your feedback has been recorded.
              </div>
            ) : (
              <form onSubmit={handleSurveySubmit} className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setSelectedRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= selectedRating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Optional Comments or Compliments
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about the technician's response time or resolution clarity..."
                    value={surveyComment}
                    onChange={(e) => setSurveyComment(e.target.value)}
                    className="w-full p-3 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRatingTicketId(null)}
                    className="neu-btn px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
