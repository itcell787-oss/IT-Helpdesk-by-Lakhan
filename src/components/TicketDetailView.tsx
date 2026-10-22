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
  Paperclip,
  Eye,
  Download,
  X,
  Image as ImageIcon,
  Printer,
  CheckCheck,
  MapPin,
} from 'lucide-react';
import { Ticket, TicketComment, TaskItem, WorkLog, AuditLog, User as UserType, formatUserBadge } from '../types';
import { SlaCountdownBadge } from './SlaCountdownBadge';

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
  onAddComment: (ticketId: string, content: string, isInternal: boolean, attachments?: any[]) => void;
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
  const [commentAttachments, setCommentAttachments] = useState<Array<{ id: string; name: string; size: number; type: string; url: string; }>>([]);
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; name: string } | null>(null);

  const matchedRequester = users.find((u) => u.email === ticket.requesterEmail || u.id === ticket.requesterId);
  const requesterEmpCode = ticket.requesterEmployeeCode || matchedRequester?.employeeCode || (ticket.requesterName?.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1001');

  // Handle direct snip paste (Ctrl+V) into comment box with 4 attachments & 2 MB total limit
  const handleCommentPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (!file) continue;

        const currentTotal = commentAttachments.reduce((acc, a) => acc + (a.size || 0), 0);
        if (commentAttachments.length >= 4) {
          alert('Attachment limit reached: Maximum 4 attachments allowed per ticket.');
          return;
        }
        if (currentTotal + file.size > 2 * 1024 * 1024) {
          alert(`Attachment limit exceeded: Total attachments cannot exceed 2 MB. (Current: ${(currentTotal / 1024 / 1024).toFixed(2)} MB)`);
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
          setCommentAttachments((prev) => {
            if (prev.length >= 4) return prev;
            return [...prev, newAttachment];
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCommentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let currentTotal = commentAttachments.reduce((acc, a) => acc + (a.size || 0), 0);
    let count = commentAttachments.length;
    const acceptedFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (count >= 4) {
        alert('Attachment limit reached: Maximum 4 attachments allowed per ticket.');
        break;
      }
      if (currentTotal + file.size > 2 * 1024 * 1024) {
        alert(`Attachment limit exceeded: Total attachments cannot exceed 2 MB. (${file.name} would exceed limit)`);
        break;
      }
      currentTotal += file.size;
      count++;
      acceptedFiles.push(file);
    }

    acceptedFiles.forEach((file) => {
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
        setCommentAttachments((prev) => (prev.length < 4 ? [...prev, newAtt] : prev));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveCommentAttachment = (id: string) => {
    setCommentAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Strict Rule: Technician & basic users can only manage tickets, NO deletion of tickets
  const canDelete = currentUser.role === 'superadmin' || currentUser.role === 'admin';

  // Business Rule: Requesters & Auditors cannot be assigned tickets.
  // Only technicians, managers, admins, and superadmins are assignable.
  const assignableTechnicians = React.useMemo(() => {
    return users.filter((u) => u.role === 'technician' || u.role === 'manager' || u.role === 'admin' || u.role === 'superadmin');
  }, [users]);

  // Check if current assignee is invalidly a requester
  const isCurrentAssigneeInvalid = React.useMemo(() => {
    if (ticket.assignedTechnicianId) {
      const assignedUser = users.find((u) => u.id === ticket.assignedTechnicianId);
      if (assignedUser && (assignedUser.role === 'requester' || assignedUser.role === 'auditor')) return true;
    }
    if (ticket.assignedTechnicianName) {
      const assignedByName = users.find((u) => u.name.toLowerCase() === ticket.assignedTechnicianName?.toLowerCase());
      if (assignedByName && (assignedByName.role === 'requester' || assignedByName.role === 'auditor')) return true;
    }
    return false;
  }, [ticket.assignedTechnicianId, ticket.assignedTechnicianName, users]);

  // If a requester was somehow previously assigned, automatically fix/unassign it
  React.useEffect(() => {
    if (isCurrentAssigneeInvalid && onUpdateTicket) {
      onUpdateTicket(ticket.id, { assignedTechnicianId: undefined, assignedTechnicianName: undefined });
    }
  }, [isCurrentAssigneeInvalid, ticket.id, onUpdateTicket]);

  // Handle comment submit
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;
    onAddComment(ticket.id, commentText, isInternalNote, commentAttachments);
    setCommentText('');
    setCommentAttachments([]);
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
              <span className="text-slate-400">·</span>
              <SlaCountdownBadge
                targetDeadline={ticket.slaResolutionDeadline || ticket.dueDate || ticket.slaFirstResponseDeadline}
                slaStatus={ticket.slaStatus}
                isResolved={ticket.status === 'resolved' || ticket.status === 'closed'}
                createdAt={ticket.createdAt}
                priority={ticket.priority}
                showLivePulse={ticket.status !== 'resolved' && ticket.status !== 'closed'}
                size="md"
              />
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

          <button
            type="button"
            onClick={() => window.print()}
            className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer whitespace-nowrap hover:bg-slate-100 dark:hover:bg-white/5 shadow-xs"
            title="Print ticket audit report with attachments & comments"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Print Ticket
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

      {/* Print-Only Header for Full Ticket Report */}
      <div className="hidden print:block mb-4 p-4 border-b-2 border-slate-900 text-slate-900 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-mono font-bold text-cyan-800 uppercase tracking-wider">IT Service Desk Support Record</div>
            <h1 className="text-xl font-bold">{ticket.id}: {ticket.subject}</h1>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold">Status: {ticket.status.toUpperCase()}</div>
            <div className="font-semibold text-slate-700">Priority: {ticket.priority.toUpperCase()}</div>
          </div>
        </div>
        <div className="text-xs text-slate-800 pt-2 border-t border-slate-200 flex flex-wrap justify-between gap-2">
          <span><strong>Requester:</strong> [{requesterEmpCode}]{ticket.requesterName} &lt;{ticket.requesterEmail}&gt;</span>
          <span><strong>Location / Desk:</strong> {ticket.locationDesk || 'Desk #14-B'}</span>
          <span><strong>Category:</strong> {ticket.category}</span>
          <span><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Main Two-Column Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Conversation Feed, Description, Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description Box */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-[10px]">
                  {ticket.requesterName.charAt(0)}
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  [{requesterEmpCode}]{ticket.requesterName}
                </span>
                <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">({ticket.requesterEmail})</span>
                {ticket.locationDesk && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/40">
                    <MapPin className="w-3 h-3" />
                    <span>{ticket.locationDesk}</span>
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="mt-3 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-normal">
              {ticket.description}
            </div>

            {/* Ticket Attachments & Direct Pasted Snips */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 space-y-2 print-break-inside-avoid">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Paperclip className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Attachments &amp; Pasted Snips ({ticket.attachments.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 print:grid-cols-2">
                  {ticket.attachments.map((att) => {
                    const isImg = att.type?.startsWith('image/') || att.url?.startsWith('data:image/');
                    return (
                      <div
                        key={att.id}
                        className="p-2 rounded-xl neu-card border border-slate-200/80 dark:border-white/10 space-y-1.5 group hover:border-cyan-500/50 transition-all print-break-inside-avoid"
                      >
                        {isImg ? (
                          <div
                            onClick={() => setPreviewModalImg({ url: att.url, name: att.name })}
                            className="w-full h-24 print:h-auto print:max-h-72 rounded-lg bg-slate-900/10 dark:bg-slate-950 overflow-hidden relative cursor-pointer flex items-center justify-center group-hover:opacity-90"
                          >
                            <img src={att.url} alt={att.name} className="w-full h-full print:w-auto print:max-h-72 object-cover print:object-contain select-none print-attachment-img" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1 print:hidden">
                              <Eye className="w-4 h-4" /> View Snip
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-2 text-slate-500">
                            <FileText className="w-6 h-6 text-cyan-600" />
                            <span className="text-[10px] font-mono mt-1 uppercase">{att.type?.split('/')[1] || 'FILE'}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] gap-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
                            {att.name}
                          </span>
                          <a
                            href={att.url}
                            download={att.name}
                            className="p-1 text-slate-400 hover:text-cyan-600 transition-colors"
                            title="Download attachment"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {Math.round(att.size / 1024)} KB
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                      <div className="font-bold text-slate-950 dark:text-white">
                        {(() => {
                          const author = users.find(u => u.id === cmt.authorId || u.name === cmt.authorName);
                          const empCode = author?.employeeCode || (cmt.authorName?.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010');
                          return `[${empCode}]${cmt.authorName}`;
                        })()}
                      </div>
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

                  {/* Comment Attachments & Snips */}
                  {cmt.attachments && cmt.attachments.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <Paperclip className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span>Attached Snips &amp; Files ({cmt.attachments.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cmt.attachments.map((att: any) => {
                          const isImg = att.type?.startsWith('image/') || att.url?.startsWith('data:image/');
                          return (
                            <div
                              key={att.id}
                              className="p-1.5 rounded-lg neu-card border border-slate-200 dark:border-white/10 flex items-center gap-2 group hover:border-cyan-500/40 print-break-inside-avoid"
                            >
                              {isImg ? (
                                <div
                                  onClick={() => setPreviewModalImg({ url: att.url, name: att.name })}
                                  className="w-12 h-12 print:w-auto print:h-auto print:max-h-60 rounded bg-slate-900/10 dark:bg-slate-950 overflow-hidden cursor-pointer relative shrink-0"
                                >
                                  <img src={att.url} alt={att.name} className="w-full h-full print:w-auto print:max-h-60 object-cover print:object-contain select-none print-attachment-img" />
                                </div>
                              ) : (
                                <FileText className="w-5 h-5 text-cyan-600 shrink-0" />
                              )}
                              <div className="text-[11px] max-w-[140px]">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
                                  {att.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {Math.round(att.size / 1024)} KB
                                </div>
                              </div>
                              <a
                                href={att.url}
                                download={att.name}
                                className="p-1 text-slate-400 hover:text-cyan-600"
                                title="Download"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                <div>
                  <textarea
                    rows={4}
                    placeholder={
                      isInternalNote
                        ? 'Type internal troubleshooting notes, escalation instructions, or diagnostic findings... (Direct snip paste supported: press Ctrl+V to attach screenshots)'
                        : 'Type response to user (this will trigger an outgoing email notification)... (Direct snip paste supported: press Ctrl+V to attach screenshots)'
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onPaste={handleCommentPaste}
                    className="w-full p-3 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                  />
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400">
                      <Paperclip className="w-3 h-3" />
                      Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold">Ctrl+V</kbd> to paste snip / screenshot
                    </span>
                    <span>Supports plain text &amp; sanitized markdown</span>
                  </div>
                </div>

                {/* Staged Comment Attachments */}
                {commentAttachments.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Attachments to include ({commentAttachments.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {commentAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs shadow-xs"
                        >
                          {att.type.startsWith('image/') ? (
                            <ImageIcon className="w-3.5 h-3.5 text-cyan-600" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span className="max-w-[150px] truncate font-semibold text-slate-800 dark:text-slate-200">
                            {att.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            ({Math.round(att.size / 1024)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCommentAttachment(att.id)}
                            className="p-0.5 text-rose-500 hover:text-rose-700"
                            title="Remove attachment"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <label className="cursor-pointer neu-btn px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-cyan-700">
                    <Paperclip className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Attach Files / Snips</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleCommentFileUpload}
                      className="hidden"
                    />
                  </label>

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

            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-400 font-bold">Live Target Timer</span>
                <SlaCountdownBadge
                  targetDeadline={ticket.slaResolutionDeadline || ticket.dueDate || ticket.slaFirstResponseDeadline}
                  slaStatus={ticket.slaStatus}
                  isResolved={ticket.status === 'resolved' || ticket.status === 'closed'}
                  createdAt={ticket.createdAt}
                  priority={ticket.priority}
                  showLivePulse={ticket.status !== 'resolved' && ticket.status !== 'closed'}
                  size="md"
                />
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isOverdue ? 'bg-rose-500 w-full animate-pulse' : ticket.slaStatus === 'warning' ? 'bg-amber-400 w-3/4' : 'bg-emerald-500 w-1/3'
                  }`}
                />
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between pt-1">
                <span>Created: {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span>Deadline: {new Date(ticket.slaResolutionDeadline || ticket.dueDate || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

            {/* Status with Direct Resolve & Close Action Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Status</label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40' :
                  ticket.status === 'closed' ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' :
                  ticket.status === 'in_progress' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800/40' :
                  'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              </div>
              <select
                value={ticket.status}
                onChange={(e) => {
                  const val = e.target.value as any;
                  if (val === 'resolved') {
                    setShowResolveModal(true);
                  } else {
                    onUpdateTicket(ticket.id, { status: val });
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 mb-2 cursor-pointer"
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

              {/* Quick Resolve & Close Action Buttons in Status Field */}
              <div className="grid grid-cols-2 gap-1.5">
                {ticket.status !== 'resolved' ? (
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(true)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition-colors"
                    title="Mark ticket as resolved with resolution summary"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateTicket(ticket.id, { status: 'in_progress' })}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer transition-colors"
                    title="Reopen ticket to In Progress"
                  >
                    <span>Reopen</span>
                  </button>
                )}

                {ticket.status !== 'closed' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateTicket(ticket.id, { status: 'closed' })}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-xs cursor-pointer transition-colors"
                    title="Permanently close ticket"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateTicket(ticket.id, { status: 'open' })}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg neu-btn text-slate-800 dark:text-slate-200 cursor-pointer"
                    title="Reopen closed ticket"
                  >
                    <span>Reopen</span>
                  </button>
                )}
              </div>
            </div>

            {/* Location / Desk No (Mandatory Field as in Asset & Inventory) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Location / Desk No *</span>
                </label>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Mandatory</span>
              </div>
              <div className="p-2.5 rounded-lg neu-inset bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span className="font-mono">{ticket.locationDesk || 'Desk #14-B (Main Floor)'}</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300">
                  Assigned
                </span>
              </div>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Assigned Technician</label>
                {currentUser.role !== 'requester' && (
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-semibold">IT Staff Only</span>
                )}
              </div>
              {currentUser.role === 'requester' ? (
                <div className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="font-bold">
                    {(() => {
                      if (!ticket.assignedTechnicianId && !ticket.assignedTechnicianName) return 'Not assigned yet';
                      const tech = users.find(u => u.id === ticket.assignedTechnicianId || u.name === ticket.assignedTechnicianName);
                      if (tech && tech.role === 'requester') return 'Not assigned yet';
                      const name = ticket.assignedTechnicianName || tech?.name || 'Not assigned yet';
                      const code = tech?.employeeCode || 'CBPL1010';
                      return `[${code}]${name}`;
                    })()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">IT Support</span>
                </div>
              ) : (
                <>
                  <select
                    value={isCurrentAssigneeInvalid ? '' : (ticket.assignedTechnicianId || '')}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const selTech = users.find((u) => u.id === selId);
                      onUpdateTicket(ticket.id, {
                        assignedTechnicianId: selId || undefined,
                        assignedTechnicianName: selTech?.name || undefined,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {assignableTechnicians.map((u) => (
                      <option key={u.id} value={u.id}>
                        [{u.employeeCode || 'CBPL1010'}]{u.name} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Requesters are excluded from ticket assignment.
                  </p>
                </>
              )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Resolve Ticket &amp; Closure Validation
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Please document the solution and classification code before closing.
            </p>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Resolution Code *</label>
              <select
                value={resolutionCode}
                onChange={(e) => setResolutionCode(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-select rounded-lg font-semibold"
              >
                <option value="solved">Solved (Standard Fix)</option>
                <option value="workaround">Workaround Provided</option>
                <option value="hardware_replaced">Hardware Replaced</option>
                <option value="vendor_fixed">Vendor / Third-Party Fixed</option>
                <option value="not_reproducible">Not Reproducible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Resolution Summary &amp; Root Cause *</label>
              <textarea
                rows={3}
                placeholder="Describe what was fixed so future technicians can reference this..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="w-full p-2.5 text-xs neu-input rounded-lg font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="neu-btn px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Work Time */}
      {showWorkLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Log Labor Work Time
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Minutes Spent</label>
              <input
                type="number"
                min={5}
                step={5}
                value={workLogMinutes}
                onChange={(e) => setWorkLogMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs neu-input rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Work Description</label>
              <input
                type="text"
                placeholder="e.g. Diagnosed packet capture, replaced transceiver"
                value={workLogNotes}
                onChange={(e) => setWorkLogNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input rounded-lg font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billableCheck"
                checked={workLogBillable}
                onChange={(e) => setWorkLogBillable(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-cyan-600 cursor-pointer"
              />
              <label htmlFor="billableCheck" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                Billable to client / department cost center
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWorkLogModal(false)}
                className="neu-btn px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddWorkLog(ticket.id, workLogMinutes, workLogNotes, workLogBillable);
                  setShowWorkLogModal(false);
                }}
                className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
              >
                Record Time
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox Modal: Image & Snip Full Preview */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-2 text-white">
              <span className="text-xs font-mono font-bold truncate max-w-md">{previewModalImg.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewModalImg.url}
                  download={previewModalImg.name}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalImg(null)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-auto rounded-2xl border border-white/20 shadow-2xl p-2 bg-slate-950 flex items-center justify-center">
              <img
                src={previewModalImg.url}
                alt={previewModalImg.name}
                className="max-h-[76vh] w-auto max-w-full object-contain rounded-xl select-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
