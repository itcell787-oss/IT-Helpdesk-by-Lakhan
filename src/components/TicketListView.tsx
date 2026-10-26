import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Search,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle,
  MoreHorizontal,
  ChevronDown,
  Layers,
  Tag,
  User,
  Check,
  Trash2,
  Calendar,
  ArrowUpDown,
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  X,
  Shield,
  CheckCircle2,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Printer,
  Paperclip,
} from 'lucide-react';
import { Ticket, User as UserType, UserRole, Organization } from '../types';
import { SlaCountdownBadge } from './SlaCountdownBadge';

export type TicketColumnKey =
  | 'ticketId'
  | 'subjectCategory'
  | 'type'
  | 'requester'
  | 'organization'
  | 'priority'
  | 'status'
  | 'assignee'
  | 'slaStatus'
  | 'createdTime';

export interface ColumnDefinition {
  key: TicketColumnKey;
  label: string;
}

export const AVAILABLE_TICKET_COLUMNS: ColumnDefinition[] = [
  { key: 'ticketId', label: 'Ticket ID' },
  { key: 'subjectCategory', label: 'Subject & Category' },
  { key: 'type', label: 'Type' },
  { key: 'requester', label: 'Requester' },
  { key: 'organization', label: 'Organization' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'slaStatus', label: 'SLA Status' },
  { key: 'createdTime', label: 'Created Time & Date' },
];

interface TicketListViewProps {
  tickets: Ticket[];
  users: UserType[];
  organizations?: Organization[];
  onSelectTicket: (ticketId: string) => void;
  onOpenNewTicket: () => void;
  onBulkUpdate: (ticketIds: string[], action: string, value: string) => void;
  onDeleteTicket?: (ticketId: string) => void;
  currentUserRole?: UserRole;
  initialQueue?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  isCustomMode?: boolean;
  onCustomModeChange?: (mode: boolean) => void;
  customPageInput?: string;
  onCustomPageInputChange?: (input: string) => void;
}

export const TicketListView: React.FC<TicketListViewProps> = ({
  tickets,
  users,
  organizations = [],
  onSelectTicket,
  onOpenNewTicket,
  onBulkUpdate,
  onDeleteTicket,
  currentUserRole = 'technician',
  initialQueue = 'all',
  currentPage: propCurrentPage,
  onPageChange,
  pageSize: propPageSize,
  onPageSizeChange,
  isCustomMode: propIsCustomMode,
  onCustomModeChange,
  customPageInput: propCustomPageInput,
  onCustomPageInputChange,
}) => {
  const [activeQueue, setActiveQueue] = useState(initialQueue);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateSort, setDateSort] = useState<'latest' | 'oldest' | 'updated' | 'due'>('latest');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showColumnChooser, setShowColumnChooser] = useState(false);

  // Configurable Ticket Limits & Pagination: 25 (default), 50, 200, or Custom up to 500
  // Restores from props or sessionStorage so viewing a ticket and going back preserves the exact page and custom size
  const [internalCurrentPage, setInternalCurrentPage] = useState<number>(() => {
    if (propCurrentPage !== undefined) return propCurrentPage;
    try {
      const saved = sessionStorage.getItem('ticket_list_page');
      if (saved) {
        const p = parseInt(saved, 10);
        if (p > 0) return p;
      }
    } catch {}
    return 1;
  });

  const [internalPageSize, setInternalPageSize] = useState<number>(() => {
    if (propPageSize !== undefined) return propPageSize;
    try {
      const saved = sessionStorage.getItem('ticket_list_page_size');
      if (saved) {
        const s = parseInt(saved, 10);
        if (s > 0 && s <= 500) return s;
      }
    } catch {}
    return 25;
  });

  const [internalCustomInput, setInternalCustomInput] = useState<string>(() => {
    if (propCustomPageInput !== undefined) return propCustomPageInput;
    try {
      const saved = sessionStorage.getItem('ticket_list_custom_input');
      if (saved) return saved;
      const s = sessionStorage.getItem('ticket_list_page_size');
      if (s) return s;
    } catch {}
    return '25';
  });

  const [internalCustomMode, setInternalCustomMode] = useState<boolean>(() => {
    if (propIsCustomMode !== undefined) return propIsCustomMode;
    try {
      const saved = sessionStorage.getItem('ticket_list_custom_mode');
      if (saved !== null) return saved === 'true';
      const s = sessionStorage.getItem('ticket_list_page_size');
      if (s) {
        const num = parseInt(s, 10);
        return num !== 25 && num !== 50 && num !== 200;
      }
    } catch {}
    return false;
  });

  const currentPage = propCurrentPage !== undefined ? propCurrentPage : internalCurrentPage;
  const setCurrentPage = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === 'function' ? val(currentPage) : val;
    setInternalCurrentPage(nextVal);
    if (onPageChange) onPageChange(nextVal);
    try { sessionStorage.setItem('ticket_list_page', String(nextVal)); } catch {}
  };

  const pageSize = propPageSize !== undefined ? propPageSize : internalPageSize;
  const setPageSize = (s: number) => {
    setInternalPageSize(s);
    if (onPageSizeChange) onPageSizeChange(s);
    try { sessionStorage.setItem('ticket_list_page_size', String(s)); } catch {}
  };

  const customPageInput = propCustomPageInput !== undefined ? propCustomPageInput : internalCustomInput;
  const setCustomPageInput = (val: string) => {
    setInternalCustomInput(val);
    if (onCustomPageInputChange) onCustomPageInputChange(val);
    try { sessionStorage.setItem('ticket_list_custom_input', val); } catch {}
  };

  const isCustomMode = propIsCustomMode !== undefined ? propIsCustomMode : internalCustomMode;
  const setIsCustomMode = (m: boolean) => {
    setInternalCustomMode(m);
    if (onCustomModeChange) onCustomModeChange(m);
    try { sessionStorage.setItem('ticket_list_custom_mode', String(m)); } catch {}
  };

  // Auto-reset page to 1 when filters change (skip initial mount to avoid wiping restored page)
  const isFirstFilterRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [activeQueue, searchQuery, selectedCategory, selectedPriority, selectedType, dateSort, dateRange]);

  // Column visibility state persisted in localStorage
  const [selectedColumns, setSelectedColumns] = useState<TicketColumnKey[]>(() => {
    try {
      const saved = localStorage.getItem('ticket_table_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      'ticketId',
      'subjectCategory',
      'type',
      'requester',
      'organization',
      'priority',
      'status',
      'assignee',
      'slaStatus',
      'createdTime',
    ];
  });

  const toggleColumn = (colKey: TicketColumnKey) => {
    setSelectedColumns((prev) => {
      let next: TicketColumnKey[];
      if (prev.includes(colKey)) {
        if (prev.length <= 1) return prev; // keep at least 1 column
        next = prev.filter((k) => k !== colKey);
      } else {
        next = [...prev, colKey];
      }
      try {
        localStorage.setItem('ticket_table_columns', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // STRICT RULE: Only Super Admin and Admin can delete tickets. Technicians & basic users cannot delete tickets!
  const canDelete = currentUserRole === 'superadmin' || currentUserRole === 'admin';
  const canViewStats = currentUserRole === 'superadmin' || currentUserRole === 'admin';

  // Extract unique categories
  const categories = Array.from(new Set(tickets.map((t) => t.category)));

  // Filter tickets
  let filteredTickets = tickets.filter((t) => {
    // Queue filter
    const now = new Date().toISOString();
    if (activeQueue === 'my') {
      if (t.status === 'resolved' || t.status === 'closed') return false;
    } else if (activeQueue === 'unassigned') {
      if (t.assignedTechnicianId || t.status === 'resolved' || t.status === 'closed') return false;
    } else if (activeQueue === 'critical') {
      if (t.priority !== 'critical' && t.priority !== 'urgent') return false;
      if (t.status === 'resolved' || t.status === 'closed') return false;
    } else if (activeQueue === 'overdue') {
      if (!t.dueDate || t.dueDate >= now || t.status === 'resolved' || t.status === 'closed') return false;
    } else if (activeQueue === 'waiting') {
      if (t.status !== 'pending_requester') return false;
    } else if (activeQueue === 'resolved') {
      if (t.status !== 'resolved' && t.status !== 'closed') return false;
    } else if (activeQueue === 'open') {
      if (t.status === 'resolved' || t.status === 'closed' || t.status === 'cancelled') return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && t.category !== selectedCategory) {
      return false;
    }

    // Priority filter
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
      return false;
    }

    // Ticket Type filter (incident, service_request, problem, change)
    if (selectedType !== 'all' && t.type !== selectedType) {
      return false;
    }

    // Date range filter
    if (dateRange !== 'all') {
      const ticketTime = new Date(t.createdAt).getTime();
      const currentTime = Date.now();
      if (dateRange === 'today') {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        if (ticketTime < todayStart) return false;
      } else if (dateRange === '7days') {
        if (currentTime - ticketTime > 7 * 24 * 3600 * 1000) return false;
      } else if (dateRange === '30days') {
        if (currentTime - ticketTime > 30 * 24 * 3600 * 1000) return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.requesterName.toLowerCase().includes(q) ||
        t.requesterEmail.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Sort tickets by date (latest, oldest, updated, due)
  filteredTickets = [...filteredTickets].sort((a, b) => {
    if (dateSort === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (dateSort === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (dateSort === 'updated') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    } else if (dateSort === 'due') {
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dueA - dueB;
    }
    return 0;
  });

  // Paginated tickets calculation (configurable limits: 25, 50, 200, custom up to 500)
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTickets.length);
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  const handlePageSizeChange = (newSize: number) => {
    const clamped = Math.min(Math.max(Number(newSize) || 25, 1), 500);
    setPageSize(clamped);
    setCustomPageInput(String(clamped));
    const isStandard = clamped === 25 || clamped === 50 || clamped === 200;
    setIsCustomMode(!isStandard);
    setCurrentPage(1);
  };

  // Toggle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTicketIds(filteredTickets.map((t) => t.id));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedTicketIds.includes(id)) {
      setSelectedTicketIds(selectedTicketIds.filter((item) => item !== id));
    } else {
      setSelectedTicketIds([...selectedTicketIds, id]);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['ID', 'Subject', 'Status', 'Priority', 'Category', 'Requester', 'Assignee', 'Created', 'Due Date'];
    const rows = filteredTickets.map((t) => [
      t.id,
      `"${t.subject.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      `"${t.category}"`,
      `"${t.requesterName}"`,
      `"${t.assignedTechnicianName || 'Unassigned'}"`,
      t.createdAt,
      t.dueDate || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `helpdesk_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Delete Single Ticket
  const confirmDeleteTicket = (ticket: Ticket) => {
    setTicketToDelete(ticket);
  };

  const executeDeleteTicket = () => {
    if (!ticketToDelete || !onDeleteTicket) return;
    onDeleteTicket(ticketToDelete.id);
    setSelectedTicketIds(selectedTicketIds.filter((id) => id !== ticketToDelete.id));
    setTicketToDelete(null);
  };

  const handleBulkDelete = () => {
    if (!onDeleteTicket || selectedTicketIds.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const executeBulkDelete = () => {
    if (!onDeleteTicket || selectedTicketIds.length === 0) return;
    selectedTicketIds.forEach((id) => onDeleteTicket(id));
    setSelectedTicketIds([]);
    setShowBulkDeleteModal(false);
  };

  const handleDownloadTicketPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Brand Title Header Banner
      doc.setFillColor(14, 165, 233); // Cyan
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('IT Helpdesk - Ticket Management Workspace Report', 14, 14);

      // Metadata
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${new Date().toLocaleString()}   |   Queue: ${activeQueue.toUpperCase()}   |   Showing: ${filteredTickets.length} of ${tickets.length} tickets`,
        14,
        30
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 34, pageWidth - 14, 34);

      let startY = 40;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, startY, pageWidth - 28, 7, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');

      doc.text('Ticket ID', 17, startY + 5);
      doc.text('Subject & Category', 42, startY + 5);
      doc.text('Requester', 115, startY + 5);
      doc.text('Priority', 160, startY + 5);
      doc.text('Status', 185, startY + 5);
      doc.text('Assignee', 215, startY + 5);
      doc.text('SLA Status', 245, startY + 5);

      startY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const items = filteredTickets.slice(0, 32);
      items.forEach((t) => {
        if (startY > 185) {
          doc.addPage();
          startY = 20;
          doc.setFillColor(241, 245, 249);
          doc.rect(14, startY, pageWidth - 28, 7, 'F');
          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'bold');
          doc.text('Ticket ID', 17, startY + 5);
          doc.text('Subject & Category', 42, startY + 5);
          doc.text('Requester', 115, startY + 5);
          doc.text('Priority', 160, startY + 5);
          doc.text('Status', 185, startY + 5);
          doc.text('Assignee', 215, startY + 5);
          doc.text('SLA Status', 245, startY + 5);
          startY += 7;
          doc.setFont('helvetica', 'normal');
        }

        doc.setTextColor(30, 41, 59);
        doc.text(t.id, 17, startY + 4.5);
        doc.text(`${t.subject.slice(0, 38)} (${t.category})`, 42, startY + 4.5);
        doc.text((t.requesterName || 'User').slice(0, 20), 115, startY + 4.5);
        doc.text(t.priority.toUpperCase(), 160, startY + 4.5);
        doc.text(t.status.toUpperCase(), 185, startY + 4.5);
        doc.text((t.assignedTechnicianName || 'Unassigned').slice(0, 16), 215, startY + 4.5);
        doc.text(t.slaStatus.toUpperCase(), 245, startY + 4.5);

        doc.setDrawColor(241, 245, 249);
        doc.line(14, startY + 6, pageWidth - 14, startY + 6);
        startY += 6;
      });

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Lakhan Tech Helpdesk ITSM • Confidential Support Record', 14, 200);
      doc.save(`helpdesk_tickets_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to download tickets PDF:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {ticketToDelete && (
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
              Are you sure you want to permanently delete ticket <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">[{ticketToDelete.id}]</span> &ldquo;{ticketToDelete.subject}&rdquo;? All comments, tasks, and audit traces for this ticket will be cleared.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteTicket}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Selected Tickets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently purge marked tickets</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete <strong className="font-bold text-rose-600 dark:text-rose-400">{selectedTicketIds.length}</strong> marked tickets? This operation cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete {selectedTicketIds.length} Tickets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Statistics Modal for Admins */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-3xl w-full p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Helpdesk Ticket Statistics &amp; Service Performance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time operational KPIs, SLA breach velocity, workload distribution, and incident telemetry.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Total Tickets</div>
                <div className="text-2xl font-bold font-mono text-cyan-700 dark:text-cyan-400 mt-1">{tickets.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">All time records</div>
              </div>

              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Open Workload</div>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Active backlog</div>
              </div>

              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Resolved Rate</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {tickets.length ? Math.round((tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length / tickets.length) * 100) : 0}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Closure velocity</div>
              </div>

              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">SLA Compliance</div>
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {tickets.length ? Math.max(0, Math.round(((tickets.length - tickets.filter((t) => t.slaStatus === 'breached').length) / tickets.length) * 100)) : 100}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {tickets.filter((t) => t.slaStatus === 'breached').length} breached
                </div>
              </div>
            </div>

            {/* Priority & Status Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Severity &amp; Priority Breakdown
                </h4>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Critical Sev-1', key: 'critical', color: 'bg-rose-500 text-rose-700 dark:text-rose-300' },
                    { label: 'Urgent Sev-2', key: 'urgent', color: 'bg-orange-500 text-orange-700 dark:text-orange-300' },
                    { label: 'High Priority', key: 'high', color: 'bg-amber-500 text-amber-700 dark:text-amber-300' },
                    { label: 'Normal Standard', key: 'normal', color: 'bg-cyan-500 text-cyan-700 dark:text-cyan-300' },
                    { label: 'Low Routine', key: 'low', color: 'bg-slate-400 text-slate-600 dark:text-slate-300' },
                  ].map((p) => {
                    const count = tickets.filter((t) => t.priority === p.key).length;
                    const pct = tickets.length ? Math.round((count / tickets.length) * 100) : 0;
                    return (
                      <div key={p.key} className="space-y-0.5">
                        <div className="flex justify-between text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          <span>{p.label}</span>
                          <span className="font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${p.color.split(' ')[0]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Lifecycle State Distribution
                </h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: 'New / Unassigned', count: tickets.filter((t) => t.status === 'new').length },
                    { label: 'Open Work', count: tickets.filter((t) => t.status === 'open').length },
                    { label: 'In Progress', count: tickets.filter((t) => t.status === 'in_progress').length },
                    { label: 'Pending Requester', count: tickets.filter((t) => t.status === 'pending_requester').length },
                    { label: 'Resolved & Closed', count: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5">
                      <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{s.label}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Technician Workload Allocation */}
            <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Technician Workload Distribution
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {users
                  .filter((u) => u.role === 'technician' || u.role === 'manager' || u.role === 'admin')
                  .map((tech) => {
                    const assignedCount = tickets.filter((t) => t.assignedTechnicianId === tech.id && t.status !== 'resolved' && t.status !== 'closed').length;
                    return (
                      <div key={tech.id} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{tech.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-mono">{tech.role}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${assignedCount > 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'}`}>
                          {assignedCount} active
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="neu-btn px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Close Statistics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Ticket Management Workspace
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            Multi-column filtering by date, ticket type, category &amp; SLA with bulk lifecycle operations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canViewStats && (
            <button
              onClick={() => setShowStatsModal(true)}
              className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
              title="Open Ticket Statistics & Performance Insights"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Statistics</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadTicketPdf}
            className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
            title="Download tickets report in PDF format"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" /> Print / PDF
          </button>
          <button
            onClick={onOpenNewTicket}
            className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap transition-transform hover:scale-[1.02]"
          >
            + Create Ticket
          </button>
        </div>
      </div>

      {/* Neumorphic Queue Tabs Deck */}
      <div className="neu-flat p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All Tickets' },
          { id: 'open', label: 'Open Work' },
          { id: 'unassigned', label: 'Unassigned Queue' },
          { id: 'critical', label: 'Critical / Urgent' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'waiting', label: 'Waiting on User' },
          { id: 'resolved', label: 'Resolved & Closed' },
        ].map((tab) => {
          const isActive = activeQueue === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveQueue(tab.id)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'neu-btn-primary shadow-sm'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Neumorphic Comprehensive Filter and Search Bar */}
      <div className="neu-flat p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="text"
              placeholder="Search by ID (ITL-...), subject, requester email, tags, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 font-semibold focus:outline-none"
            />
          </div>

          {/* Quick Date Sort: Latest / Oldest */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 neu-btn rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as any)}
                className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
                title="Sort order of tickets"
              >
                <option value="latest">Sort: Latest First (Newest)</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="updated">Sort: Recently Updated</option>
                <option value="due">Sort: SLA Due Date (Closest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Date Range, Ticket Type, Category, Priority */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-white/5 text-xs">
          {/* Choose Columns Gear Dropdown Button on Left Side */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnChooser(!showColumnChooser)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showColumnChooser
                  ? 'neu-pressed text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-inner'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
              title="Choose visible columns"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Choose Columns</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono">
                {selectedColumns.length}/10
              </span>
            </button>

            {showColumnChooser && (
              <div className="absolute left-0 top-full mt-2 z-50 w-64 p-3 rounded-2xl neu-modal border border-slate-200 dark:border-white/15 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-cyan-600" />
                    Choose columns
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = AVAILABLE_TICKET_COLUMNS.map((c) => c.key);
                        setSelectedColumns(allKeys);
                        localStorage.setItem('ticket_table_columns', JSON.stringify(allKeys));
                      }}
                      className="text-[10px] text-cyan-600 hover:underline font-semibold cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowColumnChooser(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {AVAILABLE_TICKET_COLUMNS.map((col) => {
                    const isChecked = selectedColumns.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded border-slate-400 dark:border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
                          />
                          <span>{col.label}</span>
                        </div>
                        {isChecked && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 neu-btn rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">Date:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Created Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>

          {/* Ticket Type Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 neu-btn rounded-xl">
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Ticket Types</option>
              <option value="incident">Incident</option>
              <option value="service_request">Service Request</option>
              <option value="problem">Problem</option>
              <option value="change">Change Request</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 neu-btn rounded-xl">
            <Tag className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 neu-btn rounded-xl">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Active filter counter / Reset */}
          {(selectedCategory !== 'all' || selectedPriority !== 'all' || selectedType !== 'all' || dateRange !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedPriority('all');
                setSelectedType('all');
                setDateRange('all');
                setSearchQuery('');
              }}
              className="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action floating bar if any ticket selected */}
      {selectedTicketIds.length > 0 && (
        <div className="glass-panel p-3 rounded-xl border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="text-xs text-cyan-800 dark:text-cyan-200 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="font-bold">{selectedTicketIds.length}</span> tickets selected
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onBulkUpdate(selectedTicketIds, 'set_status', 'in_progress');
                setSelectedTicketIds([]);
              }}
              className="px-2.5 py-1 text-xs bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg transition-colors cursor-pointer"
            >
              Mark In Progress
            </button>
            <button
              onClick={() => {
                onBulkUpdate(selectedTicketIds, 'set_status', 'resolved');
                setSelectedTicketIds([]);
              }}
              className="px-2.5 py-1 text-xs bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer"
            >
              Resolve Selected
            </button>
            <button
              onClick={() => {
                onBulkUpdate(selectedTicketIds, 'set_priority', 'critical');
                setSelectedTicketIds([]);
              }}
              className="px-2.5 py-1 text-xs bg-amber-600/90 hover:bg-amber-600 text-white rounded-lg transition-colors cursor-pointer"
            >
              Escalate (Critical)
            </button>
            {canDelete && onDeleteTicket && (
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Delete selected tickets"
              >
                <Trash2 className="w-3 h-3" /> Delete Selected
              </button>
            )}
            <button
              onClick={() => setSelectedTicketIds([])}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Print Only Header for Physical Printouts */}
      <div className="hidden print:block mb-4 p-4 border-b-2 border-slate-900 text-slate-900">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">IT Service Desk — Tickets Inventory Report</h1>
            <p className="text-xs text-slate-600">Printed on {new Date().toLocaleString()} | Queue: {activeQueue.toUpperCase()} | Showing {filteredTickets.length} tickets</p>
          </div>
          <div className="text-right text-xs font-mono font-bold">
            Lakhan Tech Helpdesk
          </div>
        </div>
      </div>

      {/* Ticket Data Grid Table */}
      <div className="neu-card rounded-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-slate-200/80 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border-b border-slate-300/90 dark:border-white/10 uppercase tracking-wider font-extrabold text-[11px]">
              <tr>
                <th className="p-3 w-12">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={
                        filteredTickets.length > 0 && selectedTicketIds.length === filteredTickets.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600 focus:ring-0 cursor-pointer"
                      title="Select all tickets"
                    />
                    <button
                      type="button"
                      onClick={() => setShowColumnChooser(!showColumnChooser)}
                      className={`p-0.5 rounded transition-all cursor-pointer ${
                        showColumnChooser
                          ? 'text-cyan-600 bg-cyan-100 dark:bg-cyan-950'
                          : 'text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300'
                      }`}
                      title="Choose visible columns (gear)"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </th>
                {selectedColumns.includes('ticketId') && <th className="py-3 px-2 w-28">Ticket ID</th>}
                {selectedColumns.includes('subjectCategory') && <th className="py-3 px-3">Subject &amp; Category</th>}
                {selectedColumns.includes('type') && <th className="py-3 px-3">Type</th>}
                {selectedColumns.includes('requester') && <th className="py-3 px-3">Requester</th>}
                {selectedColumns.includes('organization') && <th className="py-3 px-3">Organization</th>}
                {selectedColumns.includes('priority') && <th className="py-3 px-3">Priority</th>}
                {selectedColumns.includes('status') && <th className="py-3 px-3">Status</th>}
                {selectedColumns.includes('assignee') && <th className="py-3 px-3">Assignee</th>}
                {selectedColumns.includes('slaStatus') && <th className="py-3 px-3">SLA Status</th>}
                {selectedColumns.includes('createdTime') && <th className="py-3 px-3 text-right">Created Time &amp; Date</th>}
                {canDelete && <th className="py-3 px-2 text-center w-12">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/90 dark:divide-white/5">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={1 + selectedColumns.length + (canDelete ? 1 : 0)} className="py-12 text-center text-slate-700 dark:text-slate-300 font-semibold text-sm">
                    No tickets found matching the specified filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => {
                  const isSelected = selectedTicketIds.includes(t.id);
                  const priorityBadge: Record<string, { label: string; cls: string }> = {
                    critical: { label: 'Critical', cls: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60 font-bold' },
                    urgent: { label: 'Urgent', cls: 'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/60 font-bold' },
                    high: { label: 'High', cls: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60 font-bold' },
                    normal: { label: 'Normal', cls: 'bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/60 font-semibold' },
                    low: { label: 'Low', cls: 'bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium' },
                  };

                  const statusBadge: Record<string, { label: string; cls: string }> = {
                    new: { label: 'New', cls: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60 font-bold' },
                    open: { label: 'Open', cls: 'bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/60 font-bold' },
                    in_progress: { label: 'In Progress', cls: 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/60 font-bold' },
                    pending_requester: { label: 'Waiting User', cls: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60 font-bold' },
                    waiting_approval: { label: 'Approval', cls: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60 font-bold' },
                    on_hold: { label: 'On Hold', cls: 'bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium' },
                    resolved: { label: 'Resolved', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60 font-bold' },
                    closed: { label: 'Closed', cls: 'bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold' },
                    cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60 font-bold' },
                  };

                  const slaBadge: Record<string, { label: string; cls: string }> = {
                    within_target: { label: 'On Track', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60 font-bold' },
                    warning: { label: 'Warning', cls: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60 font-bold' },
                    breached: { label: 'Breached', cls: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60 font-bold' },
                    paused: { label: 'Paused', cls: 'bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium' },
                  };

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-cyan-50/70 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-cyan-100/70 dark:bg-cyan-500/10' : ''
                      }`}
                    >
                      <td className="p-3 w-8" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(t.id)}
                          className="rounded border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {selectedColumns.includes('ticketId') && (
                        <td
                          className="py-3 px-2 font-mono font-extrabold text-cyan-700 dark:text-cyan-400 tabular-nums text-xs"
                          onClick={() => onSelectTicket(t.id)}
                        >
                          {t.id}
                        </td>
                      )}

                      {selectedColumns.includes('subjectCategory') && (
                        <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-950 dark:text-white line-clamp-1 max-w-md text-xs">{t.subject}</span>
                            {t.attachments && t.attachments.length > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-100/80 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 font-mono text-[10px] font-bold border border-cyan-300/80 dark:border-cyan-800/60"
                                title={`${t.attachments.length} attachment(s) / snips attached`}
                              >
                                <Paperclip className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                {t.attachments.length}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5 font-semibold">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{t.category}</span>
                            {t.subcategory && (
                              <>
                                <span aria-hidden="true">/</span>
                                <span>{t.subcategory}</span>
                              </>
                            )}
                            {t.tags.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-cyan-700 dark:text-cyan-300 font-mono">#{t.tags.slice(0, 2).join(' #')}</span>
                              </>
                            )}
                          </div>
                        </td>
                      )}

                      {selectedColumns.includes('type') && (
                        <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                          <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/50">
                            {t.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                      )}

                      {selectedColumns.includes('requester') && (() => {
                        const matchedUser = users.find((u) => u.email === t.requesterEmail || u.id === t.requesterId);
                        const empCode = t.requesterEmployeeCode || matchedUser?.employeeCode || (t.requesterName?.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010');
                        return (
                          <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                            <div className="text-slate-950 dark:text-white font-mono font-bold text-xs flex items-center gap-1.5 flex-wrap">
                              <span>[{empCode}]{t.requesterName}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-[220px] font-medium mt-0.5">
                              {t.requesterEmail}
                            </div>
                          </td>
                        );
                      })()}

                      {selectedColumns.includes('organization') && (
                        <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-100/70 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-800/50">
                            <Building2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {t.organizationName || organizations?.find(o => o.id === t.organizationId)?.name || 'Lakhan Tech HQ'}
                            </span>
                          </span>
                        </td>
                      )}

                      {selectedColumns.includes('priority') && (
                        <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                          <span className={`capitalize px-2 py-0.5 rounded-md text-[10px] inline-block ${priorityBadge[t.priority]?.cls || 'bg-slate-200 text-slate-800'}`}>
                            {priorityBadge[t.priority]?.label || t.priority}
                          </span>
                        </td>
                      )}

                      {selectedColumns.includes('status') && (
                        <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                          <span className={`capitalize px-2 py-0.5 rounded-md text-[10px] inline-block ${statusBadge[t.status]?.cls || 'bg-slate-200 text-slate-800'}`}>
                            {statusBadge[t.status]?.label || t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      )}

                      {selectedColumns.includes('assignee') && (
                        <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                          <span className="text-slate-900 dark:text-slate-100 text-[11px] font-semibold">
                            {(() => {
                              if (!t.assignedTechnicianId && !t.assignedTechnicianName) {
                                return <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>;
                              }
                              const tech = users.find((u) => u.id === t.assignedTechnicianId || u.name === t.assignedTechnicianName);
                              if (tech && (tech.role === 'requester' || tech.role === 'auditor')) {
                                return <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>;
                              }
                              const code = tech?.employeeCode || 'CBPL1010';
                              const name = t.assignedTechnicianName || tech?.name;
                              return <span className="font-mono font-bold">[{code}]{name}</span>;
                            })()}
                          </span>
                        </td>
                      )}

                      {selectedColumns.includes('slaStatus') && (
                        <td className="py-3 px-3" onClick={() => onSelectTicket(t.id)}>
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md inline-block ${slaBadge[t.slaStatus]?.cls || 'bg-slate-200 text-slate-800'}`}>
                              {slaBadge[t.slaStatus]?.label || t.slaStatus}
                            </span>
                            <SlaCountdownBadge
                              targetDeadline={t.slaResolutionDeadline || t.dueDate || t.slaFirstResponseDeadline}
                              slaStatus={t.slaStatus}
                              isResolved={t.status === 'resolved' || t.status === 'closed'}
                              createdAt={t.createdAt}
                              priority={t.priority}
                              showLivePulse={t.status !== 'resolved' && t.status !== 'closed'}
                            />
                          </div>
                        </td>
                      )}

                      {/* Display explicit Time of Ticket & Date */}
                      {selectedColumns.includes('createdTime') && (
                        <td className="py-3 px-3 text-right" onClick={() => onSelectTicket(t.id)}>
                          <div className="font-mono tabular-nums text-slate-950 dark:text-white font-extrabold text-xs flex items-center justify-end gap-1">
                            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
                            {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                      )}

                      {canDelete && (
                        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => confirmDeleteTicket(t)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={`Delete ticket ${t.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Limits Bar: 25 (default), 50, 200, Custom up to 500 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-100/90 dark:bg-slate-900/80 border-t border-slate-200/90 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Showing <span className="font-bold text-cyan-700 dark:text-cyan-400 font-mono">{filteredTickets.length > 0 ? startIndex + 1 : 0}</span>–<span className="font-bold text-cyan-700 dark:text-cyan-400 font-mono">{endIndex}</span> of <span className="font-bold text-slate-900 dark:text-white font-mono">{filteredTickets.length}</span> tickets
              {filteredTickets.length !== tickets.length && (
                <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                  (filtered from {tickets.length} total)
                </span>
              )}
            </span>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-white/10">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Per page:</span>
              <div className="inline-flex rounded-lg neu-flat p-0.5 border border-slate-300/80 dark:border-white/10">
                {[25, 50, 200].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      handlePageSizeChange(size);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      pageSize === size && !isCustomMode
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    isCustomMode || (pageSize !== 25 && pageSize !== 50 && pageSize !== 200)
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300'
                  }`}
                >
                  Custom
                </button>
              </div>

              {(isCustomMode || (pageSize !== 25 && pageSize !== 50 && pageSize !== 200)) && (
                <div className="flex items-center gap-1 animate-in fade-in">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={customPageInput}
                    onChange={(e) => setCustomPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePageSizeChange(Number(customPageInput));
                      }
                    }}
                    placeholder="1-500"
                    className="w-16 px-2 py-1 text-xs neu-input rounded-md text-slate-900 dark:text-white font-mono text-center font-bold"
                    title="Enter custom page size up to 500"
                  />
                  <button
                    type="button"
                    onClick={() => handlePageSizeChange(Number(customPageInput))}
                    className="px-2 py-1 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-md cursor-pointer"
                  >
                    Apply
                  </button>
                  <span className="text-[10px] text-slate-400">(Max 500)</span>
                </div>
              )}
            </div>
          </div>

          {/* Page navigation buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white font-mono">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
