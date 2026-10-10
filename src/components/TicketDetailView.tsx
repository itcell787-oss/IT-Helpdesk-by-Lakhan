import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Shield,
  Lock,
  MessageSquare,
  CheckSquare,
  User,
  Tag,
  AlertTriangle,
  Send,
  Plus,
  CheckCircle2,
  FileText,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Laptop,
  Trash2,
} from 'lucide-react';
import { Ticket, TicketComment, TaskItem, WorkLog, AuditLog, User as UserType } from '../types';

interface TicketDetailViewProps {
  ticket: Ticket;
  comments: TicketComment[];
  tasks: TaskItem[];
  workLogs: WorkLog[];
  auditLogs: AuditLog[];
  users: UserType[];
  currentUser: UserType;
  onBack: () => void;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
  onAddComment: (ticketId: string, content: string, isInternal: boolean) => void;
  onAddTask: (ticketId: string, title: string) => void;
  onToggleTask: (ticketId: string, taskId: string, completed: boolean) => void;
  onAddWorkLog: (ticketId: string, minutes: number, notes: string, billable: boolean) => void;
  onDeleteTicket?: (ticketId: string) => void;
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticket,
  comments,
  tasks,
  workLogs,
  users,
  currentUser,
  onBack,
  onUpdateTicket,
  onAddComment,
  onAddTask,
  onToggleTask,
  onAddWorkLog,
  onDeleteTicket,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workLogMinutes, setWorkLogMinutes] = useState(30);
  const [workLogNotes, setWorkLogNotes] = useState('');
  const [workLogBillable, setWorkLogBillable] = useState(false);
  const [resolutionCode, setResolutionCode] = useState<any>(ticket.resolutionCode || 'solved');
  const [resolutionSummary, setResolutionSummary] = useState(ticket.resolutionSummary || '');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Strict Rule: Technician & basic users can only manage tickets, NO deletion of tickets
  const canDelete = currentUser.role === 'superadmin' || currentUser.role === 'admin';

  // Handle comment submit
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(ticket.id, commentText, isInternalNote);
    setCommentText('');
  };

  // Handle task add
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(ticket.id, newTaskTitle);
    setNewTaskTitle('');
  };

  // Handle resolve submit with closure validation
  const handleConfirmResolve = () => {
    if (!resolutionCode) {
      setErrorMessage('Resolution code is required before resolving.');
      return;
    }
    if (!resolutionSummary.trim()) {
      setErrorMessage('Please provide a brief resolution summary for knowledge retention.');
      return;
    }
    onUpdateTicket(ticket.id, {
      status: 'resolved',
      resolutionCode,
      resolutionSummary,
    });
    setShowResolveModal(false);
    setErrorMessage('');
  };

  // Pre-configured canned response insertion
  const applyCannedResponse = (text: string) => {
    setCommentText((prev) => (prev ? `${prev}\n\n${text}` : text));
  };

  // SLA time remaining calculation
  const resolutionDate = new Date(ticket.slaResolutionDeadline).getTime();
  const now = Date.now();
  const minutesRemaining = Math.round((resolutionDate - now) / (1000 * 60));
  const isOverdue = minutesRemaining < 0;

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Ticket Confirmation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove ticket and timeline</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete ticket <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">[{ticket.id}]</span> &ldquo;{ticket.subject}&rdquo;? All conversation comments, worklogs, and tasks will be erased.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTicket) {
                    onDeleteTicket(ticket.id);
                    setShowDeleteModal(false);
                    onBack();
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Back to Tickets"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-cyan-700 dark:text-cyan-400">{ticket.id}</span>
              <span className="text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{ticket.category}</span>
              <span className="text-slate-400">·</span>
              <span className="text-xs uppercase tracking-wider font-mono font-bold text-indigo-700 dark:text-indigo-400">{ticket.type}</span>
              <span className="text-slate-400">·</span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-semibold bg-slate-200 dark:bg-white/10 px-2.5 py-0.5 rounded-lg border border-slate-300/80 dark:border-white/10">
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Reported: {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-1">{ticket.subject}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
            <button
              onClick={() => setShowResolveModal(true)}
              className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap transition-transform hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" /> Resolve Ticket
            </button>
          ) : (
            <button
              onClick={() => onUpdateTicket(ticket.id, { status: 'in_progress' })}
              className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
            >
              Reopen Ticket
            </button>
          )}

          <button
            onClick={() => setShowWorkLogModal(true)}
            className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Log Time ({ticket.actualMinutesSpent}m)
          </button>

          {canDelete && onDeleteTicket && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer whitespace-nowrap"
              title="Delete this ticket (Admins only)"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Conversation Feed, Description, Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description Box */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-[10px]">
                  {ticket.requesterName.charAt(0)}
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-200">{ticket.requesterName}</span>
                <span className="text-slate-600 dark:text-slate-400">({ticket.requesterEmail})</span>
              </div>
              <span className="font-mono text-[11px] tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="mt-3 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-normal">
              {ticket.description}
            </div>

            {/* Custom Field Values Display */}
            {Object.keys(ticket.customFields || {}).length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Custom Ticket Attributes &amp; Fields
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(ticket.customFields).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-xl neu-card border border-slate-200/80 dark:border-white/5">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono font-semibold">{k}</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subtasks / Checklist Panel */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Execution Tasklist &amp; Subtasks ({tasks.filter((t) => t.completed).length}/{tasks.length})
              </h3>
            </div>

            <div className="space-y-2 mt-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onToggleTask(ticket.id, task.id, !task.completed)}
                  className="flex items-center gap-3 p-3 rounded-xl neu-card hover:bg-cyan-50/70 dark:hover:bg-white/5 transition-colors cursor-pointer border border-slate-200/80 dark:border-white/5"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {}}
                    className="rounded border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-950 text-cyan-600 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs flex-1 font-semibold ${
                      task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.completedAt && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                      Done {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}

              <form onSubmit={handleCreateTask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add new checklist task (e.g. Verify firmware, Run diagnostics)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                />
                <button
                  type="submit"
                  className="neu-btn px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer"
                >
                  Add Task
                </button>
              </form>
            </div>
          </div>

          {/* Conversation Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Activity &amp; Communications Stream ({comments.length})
            </h3>

            <div className="space-y-4">
              {comments.map((cmt) => (
                <div
                  key={cmt.id}
                  className={`p-4 rounded-2xl border ${
                    cmt.isInternal
                      ? 'neu-flat bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                      : 'neu-flat border-slate-200/90 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-950 dark:text-white">{cmt.authorName}</div>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold">{cmt.authorRole}</span>

                      {cmt.isInternal && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40">
                          <Lock className="w-2.5 h-2.5" /> Confidential Internal Note
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                      {new Date(cmt.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-normal">
                    {cmt.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Response Composer */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      !isInternalNote
                        ? 'neu-btn-primary shadow-xs'
                        : 'neu-btn text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Public Reply (Email to User)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isInternalNote
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'neu-btn text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Lock className="w-3 h-3" /> Private Internal Note
                  </button>
                </div>

                {/* Canned Responses dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) applyCannedResponse(e.target.value);
                    e.target.value = '';
                  }}
                  className="neu-select px-3 py-1.5 text-xs font-bold rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="">Insert Canned Macro...</option>
                  <option value="Hello David, we have identified the issue and pushed a workaround. Please restart your application and confirm.">
                    Workaround Applied
                  </option>
                  <option value="We need additional diagnostics. Could you please run 'ping 10.100.0.1' and attach the terminal output?">
                    Request Diagnostics
                  </option>
                  <option value="Your replacement workstation has been provisioned and is being dispatched via courier.">
                    Hardware Replacement Notice
                  </option>
                </select>
              </div>

              {isInternalNote && (
                <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-300 dark:border-amber-500/20 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                  <span>This note is strictly private to IT technicians and will NOT be emailed to the requester.</span>
                </div>
              )}

              <form onSubmit={handleSendComment} className="space-y-3">
                <textarea
                  rows={4}
                  placeholder={
                    isInternalNote
                      ? 'Type internal troubleshooting notes, escalation instructions, or diagnostic findings...'
                      : 'Type response to user (this will trigger an outgoing email notification)...'
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-3 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                />

                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Supports plain text &amp; sanitized markdown.
                  </div>
                  <button
                    type="submit"
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                      isInternalNote
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'neu-btn-primary'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isInternalNote ? 'Save Private Note' : 'Send Public Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Metadata & SLA Widget */}
        <div className="space-y-6">
          {/* SLA Clock Widget */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                SLA Performance Clock
              </h3>
              <span
                className={`text-[11px] font-mono font-bold uppercase ${
                  ticket.slaStatus === 'breached'
                    ? 'text-rose-600 dark:text-rose-400'
                    : ticket.slaStatus === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {ticket.slaStatus}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-400 font-semibold">Target Resolution</span>
                <span className={`font-mono font-bold tabular-nums ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-200'}`}>
                  {isOverdue ? `${Math.abs(minutesRemaining)}m overdue` : `${minutesRemaining}m remaining`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    isOverdue ? 'bg-rose-500 w-full' : ticket.slaStatus === 'warning' ? 'bg-amber-400 w-3/4' : 'bg-cyan-500 w-1/3'
                  }`}
                />
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between pt-1">
                <span>Created: {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span>Deadline: {new Date(ticket.slaResolutionDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {ticket.slaBreachReason && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold italic">
                SLA Breach Note: {ticket.slaBreachReason}
              </div>
            )}
          </div>

          {/* Ticket Time of Ticket & Lifecycle Audit Fields */}
          <div className="neu-flat p-5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Ticket Time &amp; Timestamps
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg neu-inset bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Created Time:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg neu-inset bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Last Updated:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, {new Date(ticket.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg neu-inset bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Resolution Target:</span>
                <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300 tabular-nums">
                  {new Date(ticket.slaResolutionDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({Math.max(1, Math.round((new Date(ticket.slaResolutionDeadline).getTime() - new Date(ticket.createdAt).getTime()) / 3600000))}h SLA)
                </span>
              </div>

              {ticket.firstResponseAt && (
                <div className="flex items-center justify-between p-2 rounded-lg neu-inset bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">First Responded:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {new Date(ticket.firstResponseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Properties Editor */}
          <div className="neu-flat p-5 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Ticket Properties
            </h3>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => onUpdateTicket(ticket.id, { status: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_requester">Pending Requester (Paused SLA)</option>
                <option value="waiting_approval">Waiting Approval</option>
                <option value="on_hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => onUpdateTicket(ticket.id, { priority: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Assignee Technician */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Technician</label>
              <select
                value={ticket.assignedTechnicianId || ''}
                onChange={(e) => onUpdateTicket(ticket.id, { assignedTechnicianId: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Related Assets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Linked Assets</label>
              {ticket.relatedAssetIds.length > 0 ? (
                <div className="space-y-1">
                  {ticket.relatedAssetIds.map((astId) => (
                    <div key={astId} className="flex items-center gap-2 p-2 rounded-lg neu-card bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-xs">
                      <Laptop className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">{astId}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic">No asset linked to ticket.</div>
              )}
            </div>

            {/* Resolution Information if resolved */}
            {ticket.resolutionCode && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/30 text-xs space-y-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-400 block uppercase font-mono text-[10px]">
                  Resolution Code: {ticket.resolutionCode}
                </span>
                <p className="text-slate-800 dark:text-slate-300 font-medium">{ticket.resolutionSummary}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Resolve with mandatory fields */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass-modal p-6 rounded-2xl border border-white/15 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Resolve Ticket &amp; Closure Validation
            </h3>
            <p className="text-xs text-slate-400">
              Please document the solution and classification code before closing.
            </p>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Resolution Code *</label>
              <select
                value={resolutionCode}
                onChange={(e) => setResolutionCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100"
              >
                <option value="solved">Solved (Standard Fix)</option>
                <option value="workaround">Workaround Provided</option>
                <option value="hardware_replaced">Hardware Replaced</option>
                <option value="vendor_fixed">Vendor / Third-Party Fixed</option>
                <option value="not_reproducible">Not Reproducible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Resolution Summary &amp; Root Cause *</label>
              <textarea
                rows={3}
                placeholder="Describe what was fixed so future technicians can reference this..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Work Time */}
      {showWorkLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm glass-modal p-6 rounded-2xl border border-white/15 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Log Labor Work Time
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Minutes Spent</label>
              <input
                type="number"
                min={5}
                step={5}
                value={workLogMinutes}
                onChange={(e) => setWorkLogMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Work Description</label>
              <input
                type="text"
                placeholder="e.g. Diagnosed packet capture, replaced transceiver"
                value={workLogNotes}
                onChange={(e) => setWorkLogNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billableCheck"
                checked={workLogBillable}
                onChange={(e) => setWorkLogBillable(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500"
              />
              <label htmlFor="billableCheck" className="text-xs text-slate-300 cursor-pointer">
                Billable to client / department cost center
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWorkLogModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddWorkLog(ticket.id, workLogMinutes, workLogNotes, workLogBillable);
                  setShowWorkLogModal(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm"
              >
                Record Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
