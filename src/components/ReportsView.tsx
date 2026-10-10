import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  Star,
  Users,
  PieChart,
} from 'lucide-react';
import { Ticket } from '../types';

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
}

export const ReportsView: React.FC<ReportsViewProps> = ({ metrics, tickets }) => {
  const handleExportFullReport = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Tickets Logged', metrics.totalTickets],
      ['Open Workload', metrics.openTickets],
      ['Resolved Tickets', metrics.resolvedTickets],
      ['SLA Compliance Rate', `${metrics.slaCompliancePercent}%`],
      ['Mean Time to Resolution (Hours)', metrics.avgResolutionHours],
      ['Avg First Response (Minutes)', metrics.avgFirstResponseMinutes],
      ['Customer Satisfaction CSAT', `${metrics.csatScore} / 5.0`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `itsm_sla_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            ITSM Service Performance &amp; SLA Analytics
          </h1>
          <p className="text-xs text-slate-400">
            Real-time compliance KPIs, technician workload balance, and resolution velocity metrics.
          </p>
        </div>

        <button
          onClick={handleExportFullReport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-cyan-400" /> Export Performance Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 font-medium">SLA Compliance Rate</div>
          <div className="text-3xl font-bold font-mono text-emerald-400 tabular-nums">
            {metrics.slaCompliancePercent}%
          </div>
          <div className="text-[11px] text-slate-400">Target threshold: 90.0%</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Mean Time to Resolve (MTTR)</div>
          <div className="text-3xl font-bold font-mono text-cyan-400 tabular-nums">
            {metrics.avgResolutionHours}h
          </div>
          <div className="text-[11px] text-slate-400">From creation to closure</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Avg First Response Speed</div>
          <div className="text-3xl font-bold font-mono text-white tabular-nums">
            {metrics.avgFirstResponseMinutes}m
          </div>
          <div className="text-[11px] text-slate-400">Initial contact with user</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Customer CSAT Score</div>
          <div className="text-3xl font-bold font-mono text-amber-400 tabular-nums">
            {metrics.csatScore} <span className="text-sm text-slate-400">/ 5.0</span>
          </div>
          <div className="text-[11px] text-slate-400">Post-resolution survey feedback</div>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technician Workload */}
        <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Agent Workload Distribution
          </h2>
          <div className="space-y-3">
            {Object.entries(metrics.byTechnician).map(([tech, count]) => {
              const pct = Math.round((count / (metrics.totalTickets || 1)) * 100);
              return (
                <div key={tech} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{tech}</span>
                    <span className="font-mono text-slate-400 text-[11px]">{count} tickets ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-400" />
            Incidents &amp; Requests by Domain
          </h2>
          <div className="space-y-3">
            {Object.entries(metrics.byCategory).map(([cat, count]) => {
              const pct = Math.round((count / (metrics.totalTickets || 1)) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{cat}</span>
                    <span className="font-mono text-slate-400 text-[11px]">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
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
