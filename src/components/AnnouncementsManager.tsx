import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Info,
  X,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react';
import { AnnouncementSeverity, PortalAnnouncement, User } from '../types';

interface AnnouncementsManagerProps {
  announcements: PortalAnnouncement[];
  currentUser: User | null;
  onCreateAnnouncement: (payload: {
    title: string;
    message: string;
    severity: AnnouncementSeverity;
    isActive: boolean;
    expiresAt?: string;
  }) => Promise<any>;
  onUpdateAnnouncement: (
    id: string,
    payload: {
      title?: string;
      message?: string;
      severity?: AnnouncementSeverity;
      isActive?: boolean;
      expiresAt?: string;
    }
  ) => Promise<any>;
  onDeleteAnnouncement: (id: string) => Promise<any>;
  onClose?: () => void;
  compact?: boolean;
}

const SEVERITY_META: Record<
  AnnouncementSeverity,
  {
    label: string;
    containerClass: string;
    iconClass: string;
    textClass: string;
  }
> = {
  info: {
    label: 'General Notice',
    containerClass:
      'bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-300/80 dark:border-cyan-500/35',
    iconClass: 'text-cyan-700 dark:text-cyan-400',
    textClass: 'text-cyan-900 dark:text-cyan-200',
  },
  warning: {
    label: 'Service Advisory',
    containerClass:
      'bg-amber-50/85 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-500/35',
    iconClass: 'text-amber-700 dark:text-amber-400',
    textClass: 'text-amber-900 dark:text-amber-200',
  },
  urgent: {
    label: 'Critical Outage / Urgent',
    containerClass:
      'bg-rose-50/85 dark:bg-rose-950/35 border-rose-300/80 dark:border-rose-500/35',
    iconClass: 'text-rose-700 dark:text-rose-400',
    textClass: 'text-rose-900 dark:text-rose-200',
  },
  maintenance: {
    label: 'Scheduled Maintenance',
    containerClass:
      'bg-indigo-50/85 dark:bg-indigo-950/35 border-indigo-300/80 dark:border-indigo-500/35',
    iconClass: 'text-indigo-700 dark:text-indigo-400',
    textClass: 'text-indigo-900 dark:text-indigo-200',
  },
};

export function renderSeverityIcon(severity: AnnouncementSeverity, className = 'w-4 h-4') {
  if (severity === 'urgent') return <AlertTriangle className={className} />;
  if (severity === 'warning') return <AlertTriangle className={className} />;
  if (severity === 'maintenance') return <Wrench className={className} />;
  return <Info className={className} />;
}

export const AnnouncementsManager: React.FC<AnnouncementsManagerProps> = ({
  announcements,
  currentUser,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onClose,
}) => {
  const canManage =
    Boolean(currentUser) &&
    ['technician', 'admin', 'superadmin'].includes(currentUser!.role);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AnnouncementSeverity>('info');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setSeverity('info');
    setIsActive(true);
    setExpiresAt('');
    setErrorMsg(null);
  };

  const handleStartEdit = (ann: PortalAnnouncement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setMessage(ann.message);
    setSeverity(ann.severity || 'info');
    setIsActive(ann.isActive);
    setExpiresAt(ann.expiresAt ? ann.expiresAt.slice(0, 16) : '');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!title.trim() || !message.trim()) {
      setErrorMsg('Please enter both an announcement headline and message.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setFeedback(null);
    try {
      const isoExpires = expiresAt.trim() ? new Date(expiresAt).toISOString() : '';
      if (editingId) {
        await onUpdateAnnouncement(editingId, {
          title: title.trim(),
          message: message.trim(),
          severity,
          isActive,
          expiresAt: isoExpires,
        });
        setFeedback('Announcement updated on the End-User Portal.');
      } else {
        await onCreateAnnouncement({
          title: title.trim(),
          message: message.trim(),
          severity,
          isActive,
          ...(isoExpires ? { expiresAt: isoExpires } : {}),
        });
        setFeedback(`Announcement published to the End-User Portal by ${currentUser?.name}.`);
      }
      resetForm();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            End-User Portal Announcements
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Publish service notices displayed at the top of the IT Self-Service Portal with creator attribution.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="neu-btn px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <X className="w-3.5 h-3.5" /> Close
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {canManage ? (
        <form
          onSubmit={handleSubmit}
          className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {editingId ? 'Edit Announcement' : 'Create New Announcement'}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Author shown below post: <strong className="text-slate-800 dark:text-slate-200">{currentUser?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Scheduled VPN Maintenance Tonight at 10:00 PM"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Notice Type
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AnnouncementSeverity)}
                className="w-full px-3 py-2 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="info">General Notice</option>
                <option value="warning">Service Advisory</option>
                <option value="maintenance">Scheduled Maintenance</option>
                <option value="urgent">Urgent / Critical Outage</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Announcement Message *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Write clear instructions, impact window, or guidance for end users..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <span>Show immediately on End-User Portal</span>
              </label>

              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Auto-expire (optional):
                </span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="px-2 py-1 text-[11px] neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="neu-btn px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{saving ? 'Publishing...' : editingId ? 'Save Changes' : 'Publish Announcement'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
          Only Technicians and Administrators can create or edit portal announcements.
        </div>
      )}

      {/* Existing Announcements List */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          All Portal Announcements ({announcements.length})
        </div>

        {announcements.length === 0 ? (
          <div className="p-6 rounded-2xl neu-card border border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
            No announcements have been published yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {announcements.map((ann) => {
              const meta = SEVERITY_META[ann.severity || 'info'] || SEVERITY_META.info;
              const isExpired = Boolean(ann.expiresAt && new Date(ann.expiresAt).getTime() <= Date.now());
              const visibleNow = ann.isActive && !isExpired;

              return (
                <div
                  key={ann.id}
                  className={`p-4 rounded-2xl border transition-all ${meta.containerClass} ${
                    !visibleNow ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={meta.iconClass}>
                          {renderSeverityIcon(ann.severity || 'info', 'w-4 h-4')}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{ann.title}</span>
                        <span className="text-slate-400">·</span>
                        <span className={`text-[11px] font-semibold ${meta.textClass}`}>
                          {meta.label}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span
                          className={`text-[11px] font-bold ${
                            visibleNow
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isExpired ? 'Expired' : ann.isActive ? 'Live on Portal' : 'Hidden'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {ann.message}
                      </p>

                      {/* Creator Attribution Below Announcement */}
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        <span>
                          Announced by <strong className="text-slate-900 dark:text-white">{ann.createdByName}</strong>
                        </span>
                        <span>·</span>
                        <span>{new Date(ann.createdAt).toLocaleString()}</span>
                        {ann.expiresAt && (
                          <>
                            <span>·</span>
                            <span>Expires {new Date(ann.expiresAt).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAnnouncement(ann.id, { isActive: !ann.isActive })
                          }
                          className="neu-btn px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                          title={ann.isActive ? 'Hide from Portal' : 'Show on Portal'}
                        >
                          {ann.isActive ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" /> Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Show
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(ann)}
                          className="neu-btn p-1.5 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-lg cursor-pointer"
                          title="Edit Announcement"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete announcement "${ann.title}"?`)) {
                              onDeleteAnnouncement(ann.id);
                            }
                          }}
                          className="neu-btn p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
