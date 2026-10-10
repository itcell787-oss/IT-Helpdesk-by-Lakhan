import React from 'react';
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
} from 'lucide-react';
import { Ticket, AuditLog } from '../types';

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
  onSelectTicket: (ticketId: string) => void;
  onNavigate: (view: string) => void;
  onOpenNewTicket: () => void;
  onOpenEmailSimulator: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  tickets,
  auditLogs,
  onSelectTicket,
  onNavigate,
  onOpenNewTicket,
  onOpenEmailSimulator,
}) => {
  const criticalTickets = tickets
    .filter((t) => t.priority === 'critical' || t.slaStatus === 'breached' || t.slaStatus === 'warning')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            IT Service Desk Operations
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            Real-time incident response, SLA compliance tracking, and team queue status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenEmailSimulator}
            className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Simulate Inbound Email
          </button>
          <button
            onClick={onOpenNewTicket}
            className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Create Ticket
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Open Workload</div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {metrics.openTickets}
          </div>
          <div className="mt-1 text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3" /> Active queue
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Critical / Overdue</div>
          <div className="mt-1.5 text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {metrics.criticalTickets + metrics.overdueTickets}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Immediate action
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">SLA Compliance</div>
          <div className="mt-1.5 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {metrics.slaCompliancePercent}%
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Target &gt; 90%
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">First Response</div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {metrics.avgFirstResponseMinutes}m
          </div>
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Initial reply velocity
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Avg Resolution</div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {metrics.avgResolutionHours}h
          </div>
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Mean time to solve
          </div>
        </div>

        <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">CSAT Rating</div>
          <div className="mt-1.5 text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums flex items-baseline gap-1">
            {metrics.csatScore} <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> User satisfaction
          </div>
        </div>
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Volume by Priority</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(metrics.byPriority).map(([p, count]) => {
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
                <span className="text-slate-600 dark:text-slate-400">Automations Evaluated</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-mono font-bold text-[11px]">56 Executions</span>
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
