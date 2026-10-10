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
  currentUser: User;
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
}) => {
  const isRequester = currentUser.role === 'requester';

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Software & Cloud Apps');
  const [priority, setPriority] = useState('normal');
  const [type, setType] = useState('incident');
  const [description, setDescription] = useState('');
  const [requesterId, setRequesterId] = useState(currentUser.id);
  const [requesterEmail, setRequesterEmail] = useState(currentUser.email);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [suggestedArticle, setSuggestedArticle] = useState<KnowledgeArticle | null>(null);

  // OTP Verification States for Normal Users
  const [isEmailVerified, setIsEmailVerified] = useState(!isRequester);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      if (currentUser.role !== 'requester') {
        setIsEmailVerified(true);
      } else {
        // Check if current user email is already confirmed in session
        const stored = sessionStorage.getItem(`otp_verified_${currentUser.email}`);
        if (stored === 'true') {
          setIsEmailVerified(true);
        } else {
          setIsEmailVerified(false);
        }
      }
      setRequesterEmail(currentUser.email);
      setOtpSent(false);
      setOtpMessage(null);
      setOtpError(null);
    }
  }, [isOpen, currentUser]);

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

    if (!isEmailVerified) {
      setOtpError('Email confirmation required before ticket submission.');
      return;
    }

    const reqUser = users.find((u) => u.id === requesterId) || currentUser;

    onSubmit({
      subject,
      description,
      category,
      priority,
      type,
      requesterId: reqUser.id,
      requesterName: reqUser.name,
      requesterEmail: requesterEmail || reqUser.email,
      relatedAssetIds: selectedAssetId ? [selectedAssetId] : [],
      customFields: customValues,
      otpVerified: true,
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

        {/* STEP 1: Mandatory OTP Confirmation for Normal Users */}
        {!isEmailVerified && (
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
        {isEmailVerified && (
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
                <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                <option value="Network & Connectivity">Network &amp; Connectivity</option>
                <option value="Security & Access">Security &amp; Access</option>
                <option value="User Accounts & Access">User Accounts &amp; Access</option>
                <option value="AV & Conference Rooms">AV &amp; Conference Rooms</option>
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
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Detailed Description *</label>
            <textarea
              rows={3}
              required
              placeholder="Describe what occurred, error messages, and reproduction steps..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs font-medium neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
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
    </div>
  );
};
