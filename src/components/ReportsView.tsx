import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  Star,
  Users,
  PieChart,
  Printer,
  Calendar,
  FileSpreadsheet,
  Activity,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Ticket, User } from '../types';

interface ReportsViewProps {
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
    byTechnician: Record<string, number>;
  };
  tickets: Ticket[];
  users?: User[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ metrics: initialMetrics, tickets, users = [] }) => {
  // Date Range Filter State
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
      if (!techId) return;

      if (!agentMap[techId]) {
        const matched = users.find((u) => u.id === techId);
        const empCode = matched?.employeeCode || (t.assignedTechnicianName?.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010');
        agentMap[techId] = {
          id: techId,
          name: t.assignedTechnicianName || matched?.name || 'Staff Technician',
          employeeCode: empCode,
          role: matched?.role || 'technician',
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

      const ag = agentMap[techId];
      ag.totalAssigned += 1;

      if (t.status === 'resolved') {
        ag.resolvedCount += 1;
      } else if (t.status === 'closed') {
        ag.closedCount += 1;
      } else if (t.status === 'in_progress') {
        ag.inProgressCount += 1;
      } else if (t.status === 'open' || t.status === 'new' || t.status === 'pending_requester') {
        ag.openCount += 1;
      }

      if (t.status === 'resolved' || t.status === 'closed') {
        if (t.slaStatus !== 'breached') {
          ag.slaMetCount += 1;
        } else {
          ag.slaBreachedCount += 1;
        }

        if (t.createdAt && t.updatedAt) {
          const diffHours = (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
          if (diffHours >= 0 && diffHours < 1000) {
            ag.resolutionTimes.push(diffHours);
          }
        }
      }
    });

    return Object.values(agentMap).sort((a, b) => (b.resolvedCount + b.closedCount) - (a.resolvedCount + a.closedCount));
  }, [filteredTickets, users]);

  // Export Agent CSV
  const handleExportAgentCsv = () => {
    const headers = [
      'Agent Name',
      'Employee Code',
      'Role',
      'Resolved',
      'Closed',
      'In Progress',
      'Open Queue',
      'Total Assigned',
      'Resolution Rate %',
      'SLA Met %',
      'Avg MTTR (Hours)',
      'Period',
    ];

    const rows = agentResolvedStats.map((ag) => {
      const totalResolved = ag.resolvedCount + ag.closedCount;
      const rate = ag.totalAssigned > 0 ? Math.round((totalResolved / ag.totalAssigned) * 100) : 0;
      const slaRate = totalResolved > 0 ? Math.round((ag.slaMetCount / totalResolved) * 100) : 100;
      const avgMttr = ag.resolutionTimes.length > 0
        ? (ag.resolutionTimes.reduce((acc, c) => acc + c, 0) / ag.resolutionTimes.length).toFixed(1)
        : '0.0';

      return [
        `"${ag.name.replace(/"/g, '""')}"`,
        ag.employeeCode || 'CBPL1010',
        ag.role || 'technician',
        ag.resolvedCount,
        ag.closedCount,
        ag.inProgressCount,
        ag.openCount,
        ag.totalAssigned,
        `${rate}%`,
        `${slaRate}%`,
        avgMttr,
        `"${filterLabel}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `agent_resolution_status_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Full Metrics CSV Export
  const handleExportFullReport = () => {
    const headers = ['Metric', 'Value', 'Filter Period'];
    const rows = [
      ['Total Tickets Logged', activeMetrics.totalTickets, filterLabel],
      ['Open Workload', activeMetrics.openTickets, filterLabel],
      ['Resolved Tickets', activeMetrics.resolvedTickets, filterLabel],
      ['SLA Compliance Rate', `${activeMetrics.slaCompliancePercent}%`, filterLabel],
      ['Mean Time to Resolution (Hours)', activeMetrics.avgResolutionHours, filterLabel],
      ['Avg First Response (Minutes)', activeMetrics.avgFirstResponseMinutes, filterLabel],
      ['Customer Satisfaction CSAT', `${activeMetrics.csatScore} / 5.0`, filterLabel],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `itsm_sla_report_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct Reliable jsPDF Document Generation & Download
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Brand Title Header
      doc.setFillColor(14, 165, 233); // Cyan
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('IT Helpdesk - ITSM Service Performance & SLA Report', 14, 14);

      // Subheader Metadata
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}   |   Period: ${filterLabel}   |   Total Tickets: ${filteredTickets.length}`, 14, 30);

      // Section: Primary KPIs
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 34, pageWidth - 14, 34);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. Executive SLA & Resolution Velocity Metrics', 14, 42);

      // Metric Boxes
      const boxY = 46;
      const boxW = 42;
      const boxH = 18;

      const kpiItems = [
        { label: 'SLA COMPLIANCE', val: `${activeMetrics.slaCompliancePercent}%`, sub: 'Target > 90%' },
        { label: 'RESOLVED / CLOSED', val: `${activeMetrics.resolvedTickets}`, sub: 'Solved tickets' },
        { label: 'OPEN QUEUE', val: `${activeMetrics.openTickets}`, sub: 'Active backlog' },
        { label: 'AVG MTTR', val: `${activeMetrics.avgResolutionHours}h`, sub: 'Time to resolve' },
      ];

      kpiItems.forEach((item, i) => {
        const x = 14 + i * (boxW + 4);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'D');

        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, x + 3, boxY + 5);

        doc.setFontSize(12);
        doc.setTextColor(14, 165, 233);
        doc.text(item.val, x + 3, boxY + 12);

        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(item.sub, x + 3, boxY + 16);
      });

      // Section: Agent Resolution Table
      const tableY = 74;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('2. Agent Ticket Resolution Status Breakdown', 14, tableY);

      // Table Header Row
      const thY = tableY + 6;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, thY - 4, pageWidth - 28, 8, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);

      doc.text('Technician / Agent', 16, thY);
      doc.text('Code', 65, thY);
      doc.text('Resolved', 85, thY);
      doc.text('Closed', 105, thY);
      doc.text('In Progress', 125, thY);
      doc.text('Total', 145, thY);
      doc.text('Rate %', 162, thY);
      doc.text('SLA %', 178, thY);

      let rowY = thY + 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      agentResolvedStats.slice(0, 16).forEach((ag, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, rowY - 4, pageWidth - 28, 6.5, 'F');
        }

        const totalResolved = ag.resolvedCount + ag.closedCount;
        const rate = ag.totalAssigned > 0 ? Math.round((totalResolved / ag.totalAssigned) * 100) : 0;
        const slaRate = totalResolved > 0 ? Math.round((ag.slaMetCount / totalResolved) * 100) : 100;

        doc.setTextColor(15, 23, 42);
        doc.text(ag.name.slice(0, 26), 16, rowY);
        doc.setTextColor(100, 116, 139);
        doc.text(ag.employeeCode || 'CBPL1010', 65, rowY);
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text(String(ag.resolvedCount), 85, rowY);
        doc.setTextColor(71, 85, 105);
        doc.text(String(ag.closedCount), 105, rowY);
        doc.setTextColor(14, 165, 233);
        doc.text(String(ag.inProgressCount), 125, rowY);
        doc.setTextColor(15, 23, 42);
        doc.text(String(ag.totalAssigned), 145, rowY);
        doc.text(`${rate}%`, 162, rowY);
        doc.setTextColor(slaRate >= 90 ? 16 : 225, slaRate >= 90 ? 185 : 29, slaRate >= 90 ? 129 : 72);
        doc.text(`${slaRate}%`, 178, rowY);

        rowY += 6.5;
      });

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 280, pageWidth - 14, 280);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('IT Helpdesk Enterprise CMDB & Ticket Service Desk - Confidential Internal Analytics Document', 14, 285);

      // Trigger direct download
      doc.save(`itsm_sla_report_${new Date().toISOString().slice(0, 10)}.pdf`);

      // Try browser print as secondary
      try {
        window.print();
      } catch (e) {}
    } catch (err: any) {
      console.error('PDF generation error:', err);
      // Fallback to browser print
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            ITSM Service Performance &amp; SLA Analytics
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Real-time compliance KPIs, technician workload balance, and resolution velocity metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
            title="Download formatted PDF report document"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportFullReport}
            className="neu-btn flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl transition-all cursor-pointer hover:text-cyan-700 dark:hover:text-cyan-300"
            title="Export all metrics to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">SLA Compliance Rate</div>
          <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {activeMetrics.slaCompliancePercent}%
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Target threshold: &gt; 90.0%</div>
        </div>

        <div className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Mean Time to Resolve (MTTR)</div>
          <div className="text-3xl font-extrabold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">
            {activeMetrics.avgResolutionHours}h
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">From creation to closure</div>
        </div>

        <div className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Avg First Response Speed</div>
          <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
            {activeMetrics.avgFirstResponseMinutes}m
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Initial reply velocity</div>
        </div>

        <div className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Customer CSAT Score</div>
          <div className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            {activeMetrics.csatScore} <span className="text-sm text-slate-500 font-normal">/ 5.0</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Post-resolution survey feedback</div>
        </div>
      </div>

      {/* POINT 4: AGENT TICKET RESOLUTION STATUS BREAKDOWN TABLE IN REPORTS & SLA METRICS */}
      <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Agent Ticket Resolution Status Breakdown
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Individual agent resolution volume, current active assignments, resolution success rates, and SLA met percentages for {filterLabel}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAgentCsv}
              className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              title="Download agent resolution performance breakdown as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Agent CSV</span>
            </button>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/40">
              Period: {filterLabel}
            </span>
          </div>
        </div>

        {/* Agent Resolution Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-bold">Technician / Agent</th>
                <th className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400">Resolved</th>
                <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Closed</th>
                <th className="py-2.5 px-3 font-bold text-cyan-700 dark:text-cyan-400">In Progress</th>
                <th className="py-2.5 px-3 font-bold text-amber-700 dark:text-amber-400">Open Queue</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Total Assigned</th>
                <th className="py-2.5 px-3 font-bold">Resolution Rate</th>
                <th className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400">SLA Met %</th>
                <th className="py-2.5 px-3 font-bold text-right">Avg MTTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
              {agentResolvedStats.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No tickets assigned or resolved in this period.
                  </td>
                </tr>
              ) : (
                agentResolvedStats.map((ag) => {
                  const totalResolved = ag.resolvedCount + ag.closedCount;
                  const rate = ag.totalAssigned > 0 ? Math.round((totalResolved / ag.totalAssigned) * 100) : 0;
                  const slaRate = totalResolved > 0 ? Math.round((ag.slaMetCount / totalResolved) * 100) : 100;
                  const avgMttr = ag.resolutionTimes.length > 0
                    ? (ag.resolutionTimes.reduce((acc, c) => acc + c, 0) / ag.resolutionTimes.length).toFixed(1)
                    : '—';

                  return (
                    <tr key={ag.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">
                            [{ag.employeeCode || (ag.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010')}]{ag.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono capitalize">
                            {ag.role || 'Staff Technician'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        {ag.resolvedCount}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {ag.closedCount}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                        {ag.inProgressCount}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-amber-700 dark:text-amber-400">
                        {ag.openCount}
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold text-slate-900 dark:text-white">
                        {ag.totalAssigned}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {rate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            slaRate >= 90
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                              : slaRate >= 75
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300'
                          }`}
                        >
                          {slaRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 text-right">
                        {avgMttr !== '—' ? `${avgMttr}h` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technician Workload */}
        <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Agent Workload Distribution
          </h2>
          <div className="space-y-3">
            {Object.entries(activeMetrics.byTechnician).map(([tech, count]) => {
              const pct = Math.round((count / (activeMetrics.totalTickets || 1)) * 100);
              return (
                <div key={tech} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{tech}</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px] font-semibold">{count} tickets ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-600 dark:bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Incidents &amp; Requests by Domain
          </h2>
          <div className="space-y-3">
            {Object.entries(activeMetrics.byCategory).map(([cat, count]) => {
              const pct = Math.round((count / (activeMetrics.totalTickets || 1)) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{cat}</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px] font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
