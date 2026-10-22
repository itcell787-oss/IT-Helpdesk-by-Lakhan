import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Mail,
  Zap,
  Star,
  Plus,
  Printer,
  Calendar,
  Users,
  CheckSquare,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Ticket, AuditLog, User } from '../types';

interface DashboardViewProps {
  metrics: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    criticalTickets: number;
    overdueTickets: number;
    slaCompliancePercent: number;
    avgResolutionHours: number;
    avgFirstResponseMinutes: number;
    csatScore: string;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  tickets: Ticket[];
  auditLogs: AuditLog[];
  users?: User[];
  onSelectTicket: (ticketId: string) => void;
  onNavigate: (view: string) => void;
  onOpenNewTicket: () => void;
  onOpenEmailSimulator: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics: initialMetrics,
  tickets,
  auditLogs,
  users = [],
  onSelectTicket,
  onNavigate,
  onOpenNewTicket,
  onOpenEmailSimulator,
}) => {
  // Date Range Filtering (Point 1: x date to x date, last month, all time)
  const [dateFilter, setDateFilter] = useState<'all_time' | 'last_month' | 'this_month' | 'last_7_days' | 'custom'>('all_time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate start & end bounds based on dateFilter
  const { filterStart, filterEnd, filterLabel } = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const label = start.toLocaleDateString([], { month: 'long', year: 'numeric' });
      return { filterStart: start, filterEnd: end, filterLabel: `Last Month (${label})` };
    }
    if (dateFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = start.toLocaleDateString([], { month: 'long', year: 'numeric' });
      return { filterStart: start, filterEnd: end, filterLabel: `This Month (${label})` };
    }
    if (dateFilter === 'last_7_days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { filterStart: start, filterEnd: now, filterLabel: 'Last 7 Days' };
    }
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T23:59:59`);
      return { filterStart: start, filterEnd: end, filterLabel: `${customStartDate} to ${customEndDate}` };
    }
    return { filterStart: null, filterEnd: null, filterLabel: 'All Time' };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filtered tickets within selected date range
  const filteredTickets = useMemo(() => {
    if (!filterStart || !filterEnd) return tickets;
    return tickets.filter((t) => {
      const tDate = new Date(t.createdAt).getTime();
      return tDate >= filterStart.getTime() && tDate <= filterEnd.getTime();
    });
  }, [tickets, filterStart, filterEnd]);

  // Filtered KPIs based on the filtered tickets
  const activeMetrics = useMemo(() => {
    if (dateFilter === 'all_time') return initialMetrics;

    const total = filteredTickets.length;
    const resolved = filteredTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    const open = filteredTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
    const critical = filteredTickets.filter((t) => t.priority === 'critical' && t.status !== 'resolved').length;
    const overdue = filteredTickets.filter((t) => t.dueDate && t.dueDate < new Date().toISOString() && t.status !== 'resolved').length;
    const slaMet = filteredTickets.filter((t) => (t.status === 'resolved' || t.status === 'closed') && t.slaStatus !== 'breached').length;
    const slaCompliance = resolved > 0 ? Math.round((slaMet / resolved) * 100) : 100;

    return {
      ...initialMetrics,
      totalTickets: total,
      openTickets: open,
      resolvedTickets: resolved,
      criticalTickets: critical,
      overdueTickets: overdue,
      slaCompliancePercent: slaCompliance,
    };
  }, [filteredTickets, dateFilter, initialMetrics]);

  // Agent ticket resolved status & workload calculations in selected date period
  const agentResolvedStats = useMemo(() => {
    const agentMap: Record<string, {
      id: string;
      name: string;
      employeeCode?: string;
      role?: string;
      resolvedCount: number;
      closedCount: number;
      inProgressCount: number;
      openCount: number;
      totalAssigned: number;
      slaMetCount: number;
      slaBreachedCount: number;
      resolutionTimes: number[];
    }> = {};

    // Initialize with available technician / staff users
    if (users && users.length > 0) {
      users
        .filter((u) => u.role !== 'requester')
        .forEach((u) => {
          const empCode = u.employeeCode || (u.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010');
          agentMap[u.id] = {
            id: u.id,
            name: u.name,
            employeeCode: empCode,
            role: u.role,
            resolvedCount: 0,
            closedCount: 0,
            inProgressCount: 0,
            openCount: 0,
            totalAssigned: 0,
            slaMetCount: 0,
            slaBreachedCount: 0,
            resolutionTimes: [],
          };
        });
    }

    filteredTickets.forEach((t) => {
      const techId = t.assignedTechnicianId;
      const techName = t.assignedTechnicianName;
      if (!techId && !techName) return;

      const key = techId || techName || 'unknown';
      if (!agentMap[key]) {
        const empCode = (techName?.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010');
        agentMap[key] = {
          id: key,
          name: techName || key,
          employeeCode: empCode,
          resolvedCount: 0,
          closedCount: 0,
          inProgressCount: 0,
          openCount: 0,
          totalAssigned: 0,
          slaMetCount: 0,
          slaBreachedCount: 0,
          resolutionTimes: [],
        };
      }

      agentMap[key].totalAssigned++;

      if (t.status === 'resolved') {
        agentMap[key].resolvedCount++;
      } else if (t.status === 'closed') {
        agentMap[key].closedCount++;
      } else if (t.status === 'in_progress') {
        agentMap[key].inProgressCount++;
      } else {
        agentMap[key].openCount++;
      }

      // Check SLA status for resolved/closed
      if (t.status === 'resolved' || t.status === 'closed') {
        if (t.slaStatus === 'breached') {
          agentMap[key].slaBreachedCount++;
        } else {
          agentMap[key].slaMetCount++;
        }
        if (t.resolvedAt || t.updatedAt) {
          const resTimeHours = (new Date(t.resolvedAt || t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
          if (resTimeHours > 0) agentMap[key].resolutionTimes.push(resTimeHours);
        }
      }
    });

    return Object.values(agentMap).map((ag) => {
      const totalResolved = ag.resolvedCount + ag.closedCount;
      const resolutionRate = ag.totalAssigned > 0 ? Math.round((totalResolved / ag.totalAssigned) * 100) : 0;
      const totalSlaEvaluated = ag.slaMetCount + ag.slaBreachedCount;
      const slaRate = totalSlaEvaluated > 0 ? Math.round((ag.slaMetCount / totalSlaEvaluated) * 100) : 100;
      const avgHours = ag.resolutionTimes.length > 0
        ? (ag.resolutionTimes.reduce((a, b) => a + b, 0) / ag.resolutionTimes.length).toFixed(1)
        : '-';

      return {
        ...ag,
        totalResolved,
        resolutionRate,
        slaRate,
        avgHours,
      };
    }).sort((a, b) => b.totalResolved - a.totalResolved);
  }, [filteredTickets, users]);

  // Critical tickets from the filtered set
  const criticalTickets = filteredTickets
    .filter((t) => t.priority === 'critical' || t.slaStatus === 'breached' || t.slaStatus === 'warning')
    .slice(0, 5);

  // PDF Download function using jsPDF
  const handlePrintDashboard = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Brand Title Header Banner
      doc.setFillColor(14, 165, 233); // Cyan 600
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('IT Helpdesk - Executive Operations Dashboard Report', 14, 14);

      // Metadata
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}   |   Period: ${filterLabel}   |   Total Tickets: ${activeMetrics.totalTickets}`, 14, 30);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 34, pageWidth - 14, 34);

      // KPI Metrics Summary
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. Key Operational Metrics', 14, 42);

      const boxY = 46;
      const boxW = 42;
      const boxH = 18;

      const kpiItems = [
        { label: 'TOTAL TICKETS', val: `${activeMetrics.totalTickets}`, sub: 'Incidents & Requests' },
        { label: 'OPEN BACKLOG', val: `${activeMetrics.openTickets}`, sub: 'Requires Action' },
        { label: 'RESOLVED / CLOSED', val: `${activeMetrics.resolvedTickets}`, sub: 'Successfully Solved' },
        { label: 'SLA COMPLIANCE', val: `${activeMetrics.slaCompliancePercent}%`, sub: 'Service Target' },
      ];

      kpiItems.forEach((item, i) => {
        const x = 14 + i * (boxW + 4);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(item.label, x + 3, boxY + 5);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(item.val, x + 3, boxY + 11);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(item.sub, x + 3, boxY + 15);
      });

      // Second row of KPIs: MTTR, Avg First Response, CSAT, Critical Tickets
      const row2Y = 68;
      const kpiItems2 = [
        { label: 'AVG RESOLUTION', val: `${activeMetrics.avgResolutionHours} hrs`, sub: 'Mean MTTR' },
        { label: 'FIRST RESPONSE', val: `${activeMetrics.avgFirstResponseMinutes} mins`, sub: 'Initial Reply' },
        { label: 'CSAT RATING', val: `${activeMetrics.csatScore} / 5.0`, sub: 'Customer Satisfaction' },
        { label: 'CRITICAL / BREACHED', val: `${activeMetrics.criticalTickets + activeMetrics.overdueTickets}`, sub: 'Urgent Incidents' },
      ];

      kpiItems2.forEach((item, i) => {
        const x = 14 + i * (boxW + 4);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, row2Y, boxW, boxH, 2, 2, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, row2Y, boxW, boxH, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(item.label, x + 3, row2Y + 5);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(item.val, x + 3, row2Y + 11);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(item.sub, x + 3, row2Y + 15);
      });

      // Section 2: Priority & Category Distribution
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 92, pageWidth - 14, 92);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('2. Ticket Distribution by Priority & Category', 14, 99);

      let distY = 106;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      const priorities = Object.entries(activeMetrics.byPriority || {});
      const pText = priorities.map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('   |   ');
      doc.text(`By Priority:  ${pText || 'None'}`, 14, distY);

      distY += 6;
      const categories = Object.entries(activeMetrics.byCategory || {});
      const cText = categories.slice(0, 5).map(([k, v]) => `${k}: ${v}`).join('   |   ');
      doc.text(`Top Categories:  ${cText || 'None'}`, 14, distY);

      // Section 3: Critical Incidents Table
      distY += 12;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('3. High Priority & At-Risk Incidents (Immediate Attention)', 14, distY);

      distY += 6;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, distY, pageWidth - 28, 7, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Ticket ID', 17, distY + 5);
      doc.text('Subject', 42, distY + 5);
      doc.text('Priority', 110, distY + 5);
      doc.text('Status', 135, distY + 5);
      doc.text('Assignee', 160, distY + 5);

      distY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      const tableTickets = criticalTickets.length > 0 ? criticalTickets : filteredTickets.slice(0, 5);
      if (tableTickets.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('No critical tickets in this period.', 17, distY + 6);
        distY += 10;
      } else {
        tableTickets.forEach((t) => {
          doc.setTextColor(30, 41, 59);
          doc.text(t.id, 17, distY + 5);
          doc.text(t.subject.slice(0, 36) + (t.subject.length > 36 ? '...' : ''), 42, distY + 5);
          doc.text((t.priority || 'normal').toUpperCase(), 110, distY + 5);
          doc.text((t.status || 'open').toUpperCase(), 135, distY + 5);
          doc.text((t.assignedTechnicianName || 'Unassigned').slice(0, 18), 160, distY + 5);

          doc.setDrawColor(241, 245, 249);
          doc.line(14, distY + 7, pageWidth - 14, distY + 7);
          distY += 7;
        });
      }

      // Section 4: Agent Resolution Summary Note
      distY += 8;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, distY, pageWidth - 14, distY);
      distY += 6;

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('4. Agent Resolution & SLA Metrics', 14, distY);
      distY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        'For detailed individual technician performance breakdown, SLA attainment rates, and CSV exports, navigate to Reports & SLA Metrics.',
        14,
        distY
      );

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('CONFIDENTIAL - For internal IT Service Management and management audit only', 14, 285);
      doc.text('Page 1 of 1', pageWidth - 30, 285);

      doc.save(`executive_dashboard_report_${dateFilter}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to generate dashboard PDF:', err);
    }
  };

  // Export CSV summary of agent resolution performance
  const handleExportAgentCsv = () => {
    const headers = [
      'Agent Employee Code',
      'Agent Name',
      'Role',
      'Resolved Tickets',
      'Closed Tickets',
      'Total Resolved/Closed',
      'In Progress Tickets',
      'Open Queue',
      'Total Assigned',
      'Resolution Rate %',
      'SLA Compliance %',
      'Avg Resolution Time (Hours)',
      'Reporting Period',
    ];

    const rows = agentResolvedStats.map((ag) => [
      `"${ag.employeeCode || ''}"`,
      `"${ag.name}"`,
      `"${ag.role || 'technician'}"`,
      ag.resolvedCount,
      ag.closedCount,
      ag.totalResolved,
      ag.inProgressCount,
      ag.openCount,
      ag.totalAssigned,
      `${ag.resolutionRate}%`,
      `${ag.slaRate}%`,
      ag.avgHours,
      `"${filterLabel}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `agent_ticket_resolution_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Date Range Filter & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            IT Service Desk Operations &amp; Dashboard
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
            Real-time incident response, technician resolution velocity, SLA compliance, and team queue status.
          </p>
        </div>

        {/* Action Controls & Print / PDF Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Print / Download in PDF Format Button */}
          <button
            type="button"
            onClick={handlePrintDashboard}
            className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer shadow-xs hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
            title="Print dashboard or download as PDF document via browser print dialog"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Print / Download PDF</span>
          </button>

          {/* Export Agent CSV */}
          <button
            type="button"
            onClick={handleExportAgentCsv}
            className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="Download agent resolution performance breakdown as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenEmailSimulator}
            className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Simulate Email
          </button>

          <button
            type="button"
            onClick={onOpenNewTicket}
            className="neu-btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Create Ticket
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar (Point 1: x date to x date, last month, all time) */}
      <div className="neu-flat p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Resolution Period:</span>
          </span>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-white/5">
            <button
              type="button"
              onClick={() => setDateFilter('all_time')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'all_time'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              All Time
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('last_month')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'last_month'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Last Month
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('this_month')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'this_month'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              This Month
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('last_7_days')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'last_7_days'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Last 7 Days
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                dateFilter === 'custom'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Custom Date Range
            </button>
          </div>
        </div>

        {/* Custom Date Pickers (from X date to X date) */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 text-xs font-medium animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs neu-input rounded-lg text-slate-900 dark:text-slate-100 font-mono font-semibold"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs neu-input rounded-lg text-slate-900 dark:text-slate-100 font-mono font-semibold"
              />
            </div>
          </div>
        )}

        <div className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 font-bold shrink-0">
          Showing: {filterLabel} ({filteredTickets.length} tickets)
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Logged</div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {activeMetrics.totalTickets}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            In selected period
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Resolved / Closed</div>
          <div className="mt-1.5 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {activeMetrics.resolvedTickets}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Solved incidents
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Open Workload</div>
          <div className="mt-1.5 text-2xl font-extrabold text-cyan-700 dark:text-cyan-400 font-mono tabular-nums">
            {activeMetrics.openTickets}
          </div>
          <div className="mt-1 text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3" /> Active queue
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Critical / Overdue</div>
          <div className="mt-1.5 text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {activeMetrics.criticalTickets + activeMetrics.overdueTickets}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Immediate action
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">SLA Compliance</div>
          <div className="mt-1.5 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {activeMetrics.slaCompliancePercent}%
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Target &gt; 90%
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">CSAT Rating</div>
          <div className="mt-1.5 text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums flex items-baseline gap-1">
            {activeMetrics.csatScore} <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> User satisfaction
          </div>
        </div>
      </div>

      {/* Agent Ticket Resolution Status Breakdown banner linking to Reports & SLA Metrics */}
      <div className="neu-flat p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-cyan-50/30 dark:from-slate-900/40 dark:via-slate-900 dark:to-cyan-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Agent Ticket Resolution Status Breakdown
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300">
                Reports &amp; SLA Metrics
              </span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Per-technician resolution volumes, active queues, SLA rates, and CSV exports for {filterLabel} are accessible in Reports &amp; SLA Metrics.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer shadow-sm hover:scale-[1.02] transition-transform whitespace-nowrap"
        >
          <span>View Reports &amp; SLA Metrics</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Urgent Tickets (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Critical &amp; At-Risk Incidents (SLA Priority)
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('tickets-critical')}
                className="text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-200/80 dark:divide-white/5">
              {criticalTickets.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  No critical or breached tickets in the queue.
                </div>
              ) : (
                criticalTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTicket(t.id)}
                    className="py-3 px-2 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold">{t.id}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{t.category}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{t.requesterName}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-950 dark:text-white line-clamp-1">
                        {t.subject}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className={`w-2 h-2 rounded-full ${t.priority === 'critical' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                        <span className="uppercase text-slate-800 dark:text-slate-200 font-bold">{t.priority}</span>
                      </div>
                      <span className="text-slate-400">·</span>
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] capitalize bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Priority Breakdown Bar */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Volume by Priority ({filterLabel})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(activeMetrics.byPriority).map(([p, count]) => {
                const priorityStyles: Record<string, string> = {
                  critical: 'border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/30',
                  urgent: 'border-orange-300 dark:border-orange-800/60 text-orange-900 dark:text-orange-300 bg-orange-100/70 dark:bg-orange-950/30',
                  high: 'border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/30',
                  normal: 'border-cyan-300 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-300 bg-cyan-100/70 dark:bg-cyan-950/30',
                  low: 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-900/40',
                };
                return (
                  <div key={p} className={`p-3.5 rounded-xl border font-bold ${priorityStyles[p] || 'border-slate-300 bg-slate-100 text-slate-800'}`}>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold">{p}</div>
                    <div className="mt-1 text-2xl font-black font-mono tabular-nums">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: System Status & Audit Stream */}
        <div className="space-y-5">
          {/* Quick Integration / Health Tile */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              ITSM Engine Status
            </h2>
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-600 dark:text-slate-400">Email Gateway (M365 / IMAP)</span>
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-mono font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-600 dark:text-slate-400">SLA Policy Daemon</span>
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-mono font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active (24/7)
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-600 dark:text-slate-400">Report Filter Scope</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-mono font-bold text-[11px]">{filterLabel}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-600 dark:text-slate-400">Tenant Isolation Scope</span>
                <span className="text-slate-900 dark:text-slate-100 font-mono font-bold text-[11px]">Enforced</span>
              </div>
            </div>
          </div>

          {/* Live Audit Activity Stream */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Live Audit Log
            </h2>
            <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="text-xs pb-2 border-b border-slate-200 dark:border-white/5 last:border-0 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-slate-200">{log.actorName}</span>
                    <span className="font-mono font-medium">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-cyan-700 dark:text-cyan-400 font-mono font-bold text-[11px]">
                    {log.action}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 line-clamp-1 text-[11px] font-medium">
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
