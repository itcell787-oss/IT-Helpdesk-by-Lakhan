import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  AlertCircle,
  Laptop,
  Shield,
  KeyRound,
  CheckCircle2,
  Send,
  Lock,
  Clock,
  Paperclip,
  Trash2,
  Eye,
  Upload,
  MapPin,
  Forward,
} from 'lucide-react';
import { CustomFieldDefinition, KnowledgeArticle, User, Asset } from '../types';
import { api } from '../services/api';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  customFields: CustomFieldDefinition[];
  knowledgeArticles: KnowledgeArticle[];
  users: User[];
  assets: Asset[];
  currentUser: User | null;
  requireOtp?: boolean;
  ticketCategories?: string[];
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customFields,
  knowledgeArticles,
  users,
  assets,
  currentUser,
  requireOtp = false,
  ticketCategories,
}) => {
  const isRequester = !currentUser || currentUser.role === 'requester';

  const categoriesList = ticketCategories && ticketCategories.length > 0 ? ticketCategories : [
    'Hardware & Workstations',
    'Software & Cloud Apps',
    'Network & Connectivity',
    'Security & Access',
    'User Accounts & Permissions',
    'AV & Conference Rooms',
  ];

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(categoriesList[0] || 'Hardware & Workstations');
  const [priority, setPriority] = useState('normal');
  const [type, setType] = useState('incident');
  const [description, setDescription] = useState('');
  const [requesterId, setRequesterId] = useState(currentUser?.id || 'guest');
  const [guestName, setGuestName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState(currentUser?.email || '');
  const [locationDesk, setLocationDesk] = useState('');
  const [locationDeskError, setLocationDeskError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [suggestedArticle, setSuggestedArticle] = useState<KnowledgeArticle | null>(null);
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: number; type: string; url: string; }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [managerEmail, setManagerEmail] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [forwardToManager, setForwardToManager] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (!file) continue;

        const currentTotal = attachments.reduce((acc, a) => acc + (a.size || 0), 0);
        if (attachments.length >= 4) {
          alert('Attachment limit reached: Maximum 4 attachments allowed per ticket.');
          return;
        }
        if (currentTotal + file.size > 2 * 1024 * 1024) {
          alert(`Attachment limit exceeded: Total attachments cannot exceed 2 MB. (Current: ${(currentTotal / (1024 * 1024)).toFixed(2)} MB)`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const dataUrl = uploadEvent.target?.result as string;
          const newAttachment = {
            id: `att-snip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `snip-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`,
            size: file.size,
            type: file.type || 'image/png',
            url: dataUrl,
          };
          setAttachments((prev) => (prev.length < 4 ? [...prev, newAttachment] : prev));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let currentTotal = attachments.reduce((acc, a) => acc + (a.size || 0), 0);
    let count = attachments.length;
    const filesToAdd: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (count >= 4) {
        alert('Attachment limit reached: Maximum 4 attachments allowed per ticket.');
        break;
      }
      if (currentTotal + file.size > 2 * 1024 * 1024) {
        alert(`Attachment limit exceeded: Total attachments cannot exceed 2 MB. (File "${file.name}" would exceed the 2 MB limit)`);
        break;
      }
      currentTotal += file.size;
      count++;
      filesToAdd.push(file);
    }

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAtt = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: dataUrl,
        };
        setAttachments((prev) => (prev.length < 4 ? [...prev, newAtt] : prev));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // OTP Verification States for Normal Users (defaults to true if requireOtp is false)
  const [isEmailVerified, setIsEmailVerified] = useState(!requireOtp || (currentUser && currentUser.role !== 'requester'));
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      if (!requireOtp || (currentUser && currentUser.role !== 'requester')) {
        setIsEmailVerified(true);
      } else if (currentUser?.email) {
        const stored = sessionStorage.getItem(`otp_verified_${currentUser.email}`);
        setIsEmailVerified(stored === 'true');
      } else {
        setIsEmailVerified(false);
      }
      setRequesterEmail(currentUser?.email || '');
      setRequesterId(currentUser?.id || 'guest');
      setOtpSent(false);
      setOtpMessage(null);
      setOtpError(null);
    }
  }, [isOpen, currentUser, requireOtp]);

  // Live KB Article Suggestion based on subject text
  useEffect(() => {
    if (!subject.trim()) {
      setSuggestedArticle(null);
      return;
    }
    const q = subject.toLowerCase();
    const match = knowledgeArticles.find(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some((t) => q.includes(t)) ||
        (q.includes('vpn') && a.tags.includes('vpn')) ||
        (q.includes('password') && a.tags.includes('password')) ||
        (q.includes('outlook') && a.tags.includes('outlook'))
    );
    setSuggestedArticle(match || null);
  }, [subject, knowledgeArticles]);

  if (!isOpen) return null;

  // Handle OTP Send
  const handleSendOtp = async () => {
    if (!requesterEmail || !requesterEmail.includes('@')) {
      setOtpError('Please enter a valid email address.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const res = await api.sendOtp(requesterEmail);
      setOtpSent(true);
      setOtpMessage(res.message);
      setOtpPreview(res.previewCode);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP Verify
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit code received.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await api.verifyOtp(requesterEmail, otpCode);
      if (res.verified) {
        setIsEmailVerified(true);
        setOtpMessage('✓ Email address verified successfully! You may now complete ticket details.');
        sessionStorage.setItem(`otp_verified_${requesterEmail}`, 'true');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect verification code. Please check and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    if (!locationDesk.trim()) {
      setLocationDeskError('Location / Desk No is mandatory for IT support requests.');
      return;
    }

    if (!isEmailVerified) {
      setOtpError('Email confirmation required before ticket submission.');
      return;
    }

    const reqUser = currentUser ? (users.find((u) => u.id === requesterId) || currentUser) : null;

    onSubmit({
      subject,
      description,
      category,
      priority,
      type,
      locationDesk: locationDesk.trim(),
      requesterId: reqUser ? reqUser.id : 'guest',
      requesterName: reqUser ? reqUser.name : (guestName.trim() || 'Portal User'),
      requesterEmail: requesterEmail || (reqUser ? reqUser.email : 'portal.guest@ithelpdesk.com'),
      relatedAssetIds: selectedAssetId ? [selectedAssetId] : [],
      customFields: customValues,
      attachments,
      otpVerified: true,
      managerEmail: managerEmail.trim() || undefined,
      ccRecipients: ccRecipients ? ccRecipients.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : undefined,
      forwardToManager: forwardToManager || Boolean(managerEmail.trim()),
    });

    onClose();
  };

  const currentTimeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const currentDateString = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Create IT Support Ticket
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Submit an incident, service request, or hardware dispatch.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Ticket Time Field Banner */}
        <div className="p-2.5 rounded-xl neu-card bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Ticket Submission Time:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {currentTimeString} &bull; {currentDateString}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
            SLA Clock Starts on Submit
          </span>
        </div>

        {/* Live Suggested Self-Service Article */}
        {suggestedArticle && (
          <div className="p-3 rounded-xl neu-card bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/30 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-3 animate-in fade-in">
            <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                Suggested Self-Help Solution: {suggestedArticle.title}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                This issue might already be solved in our Knowledge Base!
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: OTP Confirmation ONLY if enabled by Superadmin */}
        {requireOtp && !isEmailVerified && (
          <div className="neu-flat p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Step 1: Confirm Your Email via 6-Digit OTP Code
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              To prevent unauthorized ticket submissions, normal users must confirm their email before proceeding.
            </p>

            {otpError && (
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {otpError}
              </div>
            )}

            {otpMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                <div className="font-medium">{otpMessage}</div>
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
                value={requesterEmail}
                onChange={(e) => {
                  setRequesterEmail(e.target.value);
                  setOtpSent(false);
                }}
                disabled={otpSent}
                className="flex-1 px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60"
              />
              {!otpSent ? (
                <button
                  type="button"
                  disabled={otpLoading}
                  onClick={handleSendOtp}
                  className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {otpLoading ? 'Sending...' : 'Send 6-Digit OTP'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="neu-btn px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  Change Email
                </button>
              )}
            </div>

            {otpSent && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-36 px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-amber-500 rounded-lg text-amber-900 dark:text-amber-300 font-mono tracking-widest text-center font-bold"
                />
                <button
                  type="button"
                  disabled={otpLoading}
                  onClick={handleVerifyOtp}
                  className="neu-btn px-4 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-500/50 rounded-lg cursor-pointer"
                >
                  {otpLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Verified Email Banner */}
        {requireOtp && isEmailVerified && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Email Confirmed: <strong className="font-mono text-slate-900 dark:text-white">{requesterEmail}</strong>
            </span>
            <span className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              Verified for Submission
            </span>
          </div>
        )}

        {/* STEP 2: Main Ticket Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest Requester Info when not signed in */}
          {!currentUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl neu-card bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-medium neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Your Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john.doe@company.com"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-medium neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="incident">Incident (Outage / Bug)</option>
                <option value="service_request">Service Request</option>
                <option value="problem">Problem Investigation</option>
                <option value="change">Change Request</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low (P4)</option>
                <option value="normal">Normal (P3 Standard)</option>
                <option value="high">High (P2 Important)</option>
                <option value="urgent">Urgent (P2 Critical)</option>
                <option value="critical">Critical Sev-1 (Major Outage)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Ticket Subject / Summary *</label>
            <input
              type="text"
              required
              placeholder="e.g. Cannot connect to WireGuard VPN gateway from home Wi-Fi"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
              <span>Detailed Description *</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">
                Ctrl+V to paste snip / screenshot
              </span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe what occurred, error messages, and reproduction steps... (Direct snip paste supported: press Ctrl+V to attach screenshots)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePaste}
              className="w-full p-2.5 text-xs font-medium neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Attachments & Direct Snip Paste Zone */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-dashed border-cyan-500/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
                    <span>Attachments &amp; Direct Snip Paste</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 font-bold">
                      {attachments.length}/4 ({(attachments.reduce((acc, a) => acc + (a.size || 0), 0) / 1024).toFixed(0)} KB / 2 MB max)
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Max 4 attachments, up to 2 MB total combined size. Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 font-mono font-bold text-[10px]">Ctrl+V</kbd> to paste snips
                  </span>
                </div>
              </div>

              <label className="neu-btn px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-950/40 self-start sm:self-auto shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Attach Files / Snips</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Attachment Pills / Previews */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.type.startsWith('image/') ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          onClick={() => setPreviewImage(att.url)}
                          className="w-8 h-8 rounded object-cover border border-slate-300 dark:border-white/10 cursor-pointer shrink-0 hover:scale-105 transition-transform"
                          title="Click to preview full size"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate" title={att.name}>
                          {att.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {(att.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {att.type.startsWith('image/') && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(att.url)}
                          className="p-1 rounded text-slate-500 hover:text-cyan-600 cursor-pointer"
                          title="Preview image"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                        className="p-1 rounded text-slate-500 hover:text-rose-600 cursor-pointer"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Location / Desk No (Mandatory Field as in Asset & Inventory) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Location / Desk No *</span>
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Mandatory</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Floor 2 - Desk 14-B / Sales Bay 4"
                value={locationDesk}
                onChange={(e) => {
                  setLocationDesk(e.target.value);
                  if (locationDeskError) setLocationDeskError(null);
                }}
                className={`w-full px-3 py-1.5 text-xs font-medium neu-input bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 ${
                  locationDeskError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-white/10'
                }`}
              />
              {locationDeskError && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                  {locationDeskError}
                </p>
              )}
            </div>

            {/* Associated IT Asset */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Associated IT Asset (Optional)</label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="">None / Not Applicable</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} - {a.name} ({a.model})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Custom Fields Section with Scrollable Container so fields never overflow */}
          {customFields.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Custom Ticket Specifications
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {customFields
                  .filter((f) => f.enabled !== false)
                  .map((field) => {
                    // Conditional display rule
                    if (field.conditionalRule) {
                      let currentVal = '';
                      if (field.conditionalRule.dependsOnField === 'category') currentVal = category;
                      else if (field.conditionalRule.dependsOnField === 'priority') currentVal = priority;
                      else if (field.conditionalRule.dependsOnField === 'type') currentVal = type;
                      else currentVal = customValues[field.conditionalRule.dependsOnField] || '';

                      const matches =
                        field.conditionalRule.operator === 'equals'
                          ? currentVal === field.conditionalRule.value
                          : currentVal !== field.conditionalRule.value;
                      if (!matches) return null;
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
                            className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
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
                            className="w-full p-2 text-xs font-medium neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
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
                            className="w-full px-3 py-1.5 text-xs font-medium neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                          />
                        )}
                        {field.description && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{field.description}</div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Forward to Manager & CC Option (User Request) */}
          <div className="p-3.5 rounded-xl neu-card bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Forward className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Forward to Manager &amp; CC Option
                </span>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forwardToManager}
                  onChange={(e) => setForwardToManager(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <span>Forward to Manager</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Manager Email {forwardToManager ? <span className="text-cyan-600 font-bold">*</span> : ''}
                </label>
                <input
                  type="email"
                  placeholder="manager@company.com"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional CC Recipients
                </label>
                <input
                  type="text"
                  placeholder="colleague@company.com"
                  value={ccRecipients}
                  onChange={(e) => setCcRecipients(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isEmailVerified}
              className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      </div>

      {/* Attachment Image Full Size Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2 bg-slate-900 rounded-2xl border border-white/20 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Attachment preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
