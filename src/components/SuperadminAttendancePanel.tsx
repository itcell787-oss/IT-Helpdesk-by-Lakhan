import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Coffee,
  Flame,
  Users,
  Calendar,
  Mail,
  Send,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Search,
  Edit3,
  ChevronDown,
  ChevronUp,
  Power,
  Ticket as TicketIcon,
  Plus,
  Trash2,
  ClipboardList,
  Ban,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  AttendanceReportSchedule,
  TechnicianAttendanceOverviewItem,
  TechnicianAssignedTask,
  User,
} from '../types';
import { api } from '../services/api';
import { formatHMS, formatHM } from './TechnicianShiftTimer';

interface SuperadminAttendancePanelProps {
  users?: User[];
  superadminEmail?: string;
  onUserWorkHoursUpdated?: () => void;
}

export const SuperadminAttendancePanel: React.FC<SuperadminAttendancePanelProps> = ({
  users = [],
  superadminEmail = 'admin@lakhanglobal.com',
  onUserWorkHoursUpdated,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    period: 'daily' | 'monthly';
    dateKey: string;
    monthKey: string;
    generatedAt: string;
    totals: {
      totalTechnicians: number;
      workingNow: number;
      onBreakNow: number;
      stoppedToday: number;
      notStarted: number;
      totalWorkSeconds: number;
      totalBreakSeconds: number;
      totalOvertimeSeconds: number;
      techniciansWithOvertime: number;
      totalTasks: number;
      tasksCompleted: number;
      assignedTasksTotal?: number;
      assignedTasksCompleted?: number;
      assignedTasksPending?: number;
      assignedTasksCancelled?: number;
    };
    technicians: TechnicianAttendanceOverviewItem[];
  } | null>(null);

  // Live 1-second offset so active technicians' clocks tick smoothly in Superadmin view
  const [fetchedAtMs, setFetchedAtMs] = useState<number>(Date.now());
  const [tickNowMs, setTickNowMs] = useState<number>(Date.now());

  // Inline custom work hours editor per technician
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [editWorkHours, setEditWorkHours] = useState<string>('8');
  const [editShiftLabel, setEditShiftLabel] = useState<string>('');
  const [savingHours, setSavingHours] = useState(false);

  // Expanded technician ticket/task details
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);

  // Superadmin Assigned Operational Tasks state
  const [assignedTasks, setAssignedTasks] = useState<TechnicianAssignedTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [newTaskTechId, setNewTaskTechId] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [assigningTask, setAssigningTask] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);

  // Email Scheduler state
  const [schedule, setSchedule] = useState<AttendanceReportSchedule>({
    enabled: false,
    frequency: 'daily',
    recipientEmail: superadminEmail,
    ccEmails: [],
    dailySendTime: '19:00',
    monthlyDayOfMonth: 1,
    monthlySendTime: '09:00',
    includeTaskStatus: true,
    includeOvertimeDetails: true,
  });
  const [ccInput, setCcInput] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [sendingReport, setSendingReport] = useState<'daily' | 'monthly' | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setBannerMsg({ type, text });
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.getAttendanceOverview({
        period,
        date: selectedDate,
        month: selectedMonth,
      });
      setOverview(data);
      const now = Date.now();
      setFetchedAtMs(now);
      setTickNowMs(now);
    } catch {
      // Ignore transient poll errors
    } finally {
      setLoading(false);
    }
  }, [period, selectedDate, selectedMonth]);

  const fetchAssignedTasks = useCallback(async () => {
    try {
      const rows = await api.getTechnicianTasks();
      setAssignedTasks(Array.isArray(rows) ? rows : []);
    } catch {
      // Ignore transient error
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const s = await api.getAttendanceSchedule();
      if (s) {
        setSchedule({
          ...s,
          ccEmails: Array.isArray(s.ccEmails) ? s.ccEmails : [],
        });
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    setTasksLoading(true);
    fetchAssignedTasks();
    fetchSchedule();
  }, [fetchAssignedTasks, fetchSchedule]);

  // Poll backend every 6 seconds & tick UI every 1 second for live active timers
  useEffect(() => {
    const poll = setInterval(() => {
      fetchOverview();
      fetchAssignedTasks();
    }, 6000);
    const ticker = setInterval(() => setTickNowMs(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(ticker);
    };
  }, [fetchOverview, fetchAssignedTasks]);

  const technicianChoices = (overview?.technicians && overview.technicians.length > 0)
    ? overview.technicians.map((t) => ({ id: t.technicianId, name: t.technicianName, email: t.technicianEmail }))
    : users.filter((u) => u.role === 'technician').map((u) => ({ id: u.id, name: u.name, email: u.email }));

  useEffect(() => {
    if (!newTaskTechId && technicianChoices.length > 0) {
      setNewTaskTechId(technicianChoices[0].id);
    }
  }, [newTaskTechId, technicianChoices]);

  const deltaSeconds = Math.max(0, Math.floor((tickNowMs - fetchedAtMs) / 1000));

  const getLiveTechMetrics = (item: TechnicianAttendanceOverviewItem) => {
    let workSec = item.totalWorkSeconds;
    let breakSec = item.totalBreakSeconds;
    if (item.currentStatus === 'working') {
      workSec += deltaSeconds;
    } else if (item.currentStatus === 'on_break') {
      breakSec += deltaSeconds;
    }

    // Add live overtime delta only if today/current period
    const dailyTargetSec = Math.round((item.assignedWorkHoursPerDay || 8) * 3600);
    let otSec = item.overtimeSeconds;
    if (item.currentStatus === 'working' && item.activeSession) {
      const activeWorkLive = item.activeSession.totalWorkSeconds + deltaSeconds;
      if (activeWorkLive > dailyTargetSec) {
        const extraFromActive = activeWorkLive - dailyTargetSec;
        const previousActiveOt = Math.max(0, item.activeSession.totalWorkSeconds - dailyTargetSec);
        otSec = Math.max(0, item.overtimeSeconds - previousActiveOt + extraFromActive);
      }
    }

    return {
      workSec,
      breakSec,
      otSec,
      isOvertime: otSec > 0,
    };
  };

  const handleSaveCustomHours = async (techId: string) => {
    const parsed = Number(editWorkHours);
    if (isNaN(parsed) || parsed < 0.5 || parsed > 24) {
      showBanner('error', 'Work hours per day must be between 0.5 and 24.');
      return;
    }
    setSavingHours(true);
    try {
      const res = await api.assignTechnicianWorkHours(techId, parsed, editShiftLabel);
      setEditingTechId(null);
      showBanner('success', res.message || `Assigned ${parsed} hrs/day custom work hours.`);
      await fetchOverview();
      onUserWorkHoursUpdated?.();
    } catch (err: any) {
      showBanner('error', err.message || 'Failed assigning work hours');
    } finally {
      setSavingHours(false);
    }
  };

  const parseEmailTokens = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[,;\s\n]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes('@') && e.includes('.'))
      )
    );
  };

  const handleAddCcFromInput = () => {
    const parsed = parseEmailTokens(ccInput);
    if (parsed.length === 0) return;
    setSchedule((prev) => ({
      ...prev,
      ccEmails: Array.from(new Set([...(prev.ccEmails || []), ...parsed])),
    }));
    setCcInput('');
  };

  const handleRemoveCc = (emailToRemove: string) => {
    setSchedule((prev) => ({
      ...prev,
      ccEmails: (prev.ccEmails || []).filter((e) => e !== emailToRemove),
    }));
  };

  const getMergedCcList = () => {
    const fromInput = ccInput.trim() ? parseEmailTokens(ccInput) : [];
    return Array.from(new Set([...(schedule.ccEmails || []), ...fromInput]));
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTechId) {
      showBanner('error', 'Please select a technician to assign the task.');
      return;
    }
    if (!newTaskSubject.trim() || !newTaskDescription.trim()) {
      showBanner('error', 'Task Subject and Description are both required.');
      return;
    }
    setAssigningTask(true);
    try {
      const created = await api.createTechnicianTask({
        technicianId: newTaskTechId,
        subject: newTaskSubject.trim(),
        description: newTaskDescription.trim(),
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
      });
      setAssignedTasks((prev) => [created, ...prev]);
      setNewTaskSubject('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskPriority('normal');
      showBanner('success', `Task "${created.subject}" assigned to ${created.technicianName}.`);
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err.message || 'Failed assigning task to technician');
    } finally {
      setAssigningTask(false);
    }
  };

  const handleToggleAssignedTask = async (task: TechnicianAssignedTask) => {
    setTaskBusyId(task.id);
    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      const updated = await api.updateTechnicianTask(task.id, { status: nextStatus });
      setAssignedTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showBanner(
        'success',
        `Task "${updated.subject}" marked as ${updated.status === 'completed' ? 'Completed' : 'Pending'}.`
      );
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err.message || 'Failed updating task status');
    } finally {
      setTaskBusyId(null);
    }
  };

  const handleDeleteAssignedTask = async (task: TechnicianAssignedTask) => {
    setTaskBusyId(task.id);
    try {
      await api.deleteTechnicianTask(task.id);
      setAssignedTasks((prev) => prev.filter((t) => t.id !== task.id));
      showBanner('success', `Removed assigned task "${task.subject}".`);
      fetchOverview();
    } catch (err: any) {
      showBanner('error', err.message || 'Failed deleting task');
    } finally {
      setTaskBusyId(null);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule.recipientEmail || !schedule.recipientEmail.includes('@')) {
      showBanner('error', 'Please enter a valid Superadmin recipient email address.');
      return;
    }
    const mergedCc = getMergedCcList();
    setScheduleSaving(true);
    try {
      const saved = await api.updateAttendanceSchedule({
        ...schedule,
        ccEmails: mergedCc,
      });
      setSchedule(saved);
      setCcInput('');
      showBanner(
        'success',
        saved.enabled
          ? `Automated ${saved.frequency.toUpperCase()} attendance & task report emails scheduled to ${saved.recipientEmail}${saved.ccEmails && saved.ccEmails.length ? ` (CC: ${saved.ccEmails.join(', ')})` : ''}.`
          : 'Automated attendance email scheduler saved (currently paused/OFF).'
      );
    } catch (err: any) {
      showBanner('error', err.message || 'Failed saving email schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleSendReportNow = async (freq: 'daily' | 'monthly') => {
    const mergedCc = getMergedCcList();
    setSendingReport(freq);
    try {
      const res = await api.sendAttendanceReportNow({
        frequency: freq,
        recipientEmail: schedule.recipientEmail,
        ccEmails: mergedCc,
        date: selectedDate,
        month: selectedMonth,
      });
      await fetchSchedule();
      showBanner(
        'success',
        `${freq === 'daily' ? 'Daily' : 'Monthly'} Attendance & Task Status email dispatched to ${res.recipient}${res.cc && res.cc.length ? ` (CC: ${res.cc.join(', ')})` : ''} (${res.status === 'sent' ? 'Sent via SMTP' : 'Recorded via Gateway Log'}).`
      );
    } catch (err: any) {
      showBanner('error', err.message || `Failed dispatching ${freq} report`);
    } finally {
      setSendingReport(null);
    }
  };

  const filteredTechs = (overview?.technicians || []).filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.technicianName.toLowerCase().includes(q) ||
      t.technicianEmail.toLowerCase().includes(q) ||
      (t.employeeCode && t.employeeCode.toLowerCase().includes(q))
    );
  });

  // Live totals
  const liveTotals = filteredTechs.reduce(
    (acc, t) => {
      const m = getLiveTechMetrics(t);
      acc.work += m.workSec;
      acc.brk += m.breakSec;
      acc.ot += m.otSec;
      if (m.isOvertime) acc.otCount += 1;
      return acc;
    },
    { work: 0, brk: 0, ot: 0, otCount: 0 }
  );

  return (
    <div className="space-y-6">
      {bannerMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700/60 text-rose-800 dark:text-rose-300'
          }`}
        >
          {bannerMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Working Now</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {overview?.totals.workingNow ?? 0}
            <span className="text-xs font-semibold text-slate-400"> / {overview?.totals.totalTechnicians ?? 0}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {overview?.totals.onBreakNow ?? 0} on break · {overview?.totals.notStarted ?? 0} offline
          </div>
        </div>

        <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Total Working Time</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">
            {formatHM(liveTotals.work)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {period === 'daily' ? `Date: ${selectedDate}` : `Month: ${selectedMonth}`}
          </div>
        </div>

        <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-amber-500" />
            <span>Total Break Time</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            {formatHM(liveTotals.brk)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Excluded from net work hours
          </div>
        </div>

        <div
          className={`neu-card p-4 rounded-xl border space-y-1 ${
            liveTotals.ot > 0
              ? 'border-rose-400/60 dark:border-rose-500/40 bg-rose-500/5'
              : 'border-slate-200 dark:border-white/10'
          }`}
        >
          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span>Total Overtime</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            {liveTotals.ot > 0 ? `+${formatHM(liveTotals.ot)}` : '0m'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {liveTotals.otCount} technician(s) exceeded target
          </div>
        </div>

        <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1 col-span-2 lg:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Assigned &amp; Ticket Tasks</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
            {overview?.totals.assignedTasksCompleted ?? 0}
            <span className="text-xs font-semibold text-slate-400"> / {overview?.totals.assignedTasksTotal ?? 0}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {overview?.totals.assignedTasksPending ?? 0} pending · {overview?.totals.assignedTasksCancelled ?? 0} cancelled · Tickets: {overview?.totals.tasksCompleted ?? 0}/{overview?.totals.totalTasks ?? 0}
          </div>
        </div>
      </div>

      {/* Period Filters & Search */}
      <div className="neu-flat p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/70 border border-slate-300 dark:border-white/10">
            <button
              type="button"
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'daily'
                  ? 'neu-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Attendance
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'monthly'
                  ? 'neu-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Summary
            </button>
          </div>

          {period === 'daily' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-input text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none font-mono text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl neu-input text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent focus:outline-none font-mono text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter technician name, ID, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs neu-input rounded-xl focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={fetchOverview}
            className="neu-btn px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            title="Refresh live working hours"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Technician Working Time, Custom Work Hours & Overtime Table */}
      <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Technician Working Time, Custom Work Hours &amp; Overtime Monitor
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Assign custom daily work hour targets per technician. Overtime is automatically highlighted when worked hours exceed their assigned shift target.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-3">Live Timer Status</th>
                <th className="py-3 px-3">Clock In / Out</th>
                <th className="py-3 px-3">Working Time</th>
                <th className="py-3 px-3">Break Time</th>
                <th className="py-3 px-3">Assigned Work Hours</th>
                <th className="py-3 px-3">Overtime Status</th>
                <th className="py-3 px-4">Tickets &amp; Task Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredTechs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No technicians match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTechs.map((tech) => {
                  const live = getLiveTechMetrics(tech);
                  const isEditing = editingTechId === tech.technicianId;
                  const isExpanded = expandedTechId === tech.technicianId;

                  return (
                    <React.Fragment key={tech.technicianId}>
                      <tr className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                        {/* Technician Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                              {tech.technicianName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{tech.technicianName}</span>
                                {tech.employeeCode && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {tech.employeeCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {tech.technicianEmail}
                              </div>
                              {tech.assignedShiftLabel && (
                                <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">
                                  Shift: {tech.assignedShiftLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Live Status */}
                        <td className="py-3 px-3">
                          {tech.currentStatus === 'working' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              Working
                            </span>
                          )}
                          {tech.currentStatus === 'on_break' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                              <Coffee className="w-3 h-3" />
                              On Break
                            </span>
                          )}
                          {tech.currentStatus === 'stopped' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Shift Done
                            </span>
                          )}
                          {tech.currentStatus === 'not_started' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase font-mono bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-white/5">
                              Not Started
                            </span>
                          )}
                        </td>

                        {/* Clock In / Out */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          <div>
                            In:{' '}
                            <strong>
                              {tech.firstClockIn
                                ? new Date(tech.firstClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </strong>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Out:{' '}
                            {tech.currentStatus === 'working' || tech.currentStatus === 'on_break'
                              ? 'Active'
                              : tech.lastClockOut
                                ? new Date(tech.lastClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                          </div>
                        </td>

                        {/* Working Time */}
                        <td className="py-3 px-3">
                          <div className="font-mono text-sm font-extrabold tabular-nums text-cyan-700 dark:text-cyan-400">
                            {tech.currentStatus === 'working' ? formatHMS(live.workSec) : formatHM(live.workSec)}
                          </div>
                          {period === 'monthly' && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {tech.daysWorked} day(s) logged
                            </div>
                          )}
                        </td>

                        {/* Break Time */}
                        <td className="py-3 px-3 font-mono text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          {tech.currentStatus === 'on_break' ? formatHMS(live.breakSec) : formatHM(live.breakSec)}
                        </td>

                        {/* Assigned Custom Work Hours */}
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 min-w-[165px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.5"
                                  max="24"
                                  value={editWorkHours}
                                  onChange={(e) => setEditWorkHours(e.target.value)}
                                  className="w-16 px-2 py-1 text-xs neu-input rounded-lg font-mono font-bold"
                                />
                                <span className="text-[10px] text-slate-500">hrs/day</span>
                              </div>
                              <input
                                type="text"
                                value={editShiftLabel}
                                onChange={(e) => setEditShiftLabel(e.target.value)}
                                placeholder="Shift e.g. 9AM-6PM"
                                className="w-full px-2 py-1 text-[10px] neu-input rounded-lg"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={savingHours}
                                  onClick={() => handleSaveCustomHours(tech.technicianId)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  {savingHours ? '...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTechId(null)}
                                  className="px-2 py-1 rounded-lg neu-btn text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                                {tech.assignedWorkHoursPerDay} hrs/day
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTechId(tech.technicianId);
                                  setEditWorkHours(String(tech.assignedWorkHoursPerDay || 8));
                                  setEditShiftLabel(tech.assignedShiftLabel || '');
                                }}
                                className="p-1.5 rounded-lg neu-btn text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                                title="Assign Custom Work Hours"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Overtime Badge */}
                        <td className="py-3 px-3">
                          {live.isOvertime ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[11px] font-extrabold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40">
                              <Flame className="w-3.5 h-3.5 text-rose-500" />
                              +{formatHM(live.otSec)} OT
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              0m (On Target)
                            </span>
                          )}
                        </td>

                        {/* Ticket & Task Status */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5 text-[11px]">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                Assigned Tasks:{' '}
                                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                  {tech.taskStatus.assignedTasksCompleted ?? 0}/{tech.taskStatus.assignedTasksTotal ?? 0}
                                </span>
                                {(tech.taskStatus.assignedTasksPending ?? 0) > 0 && (
                                  <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                    ({tech.taskStatus.assignedTasksPending} pending)
                                  </span>
                                )}
                                {(tech.taskStatus.assignedTasksCancelled ?? 0) > 0 && (
                                  <span className="ml-1 text-[10px] text-rose-600 dark:text-rose-400 font-mono">
                                    ({tech.taskStatus.assignedTasksCancelled} cancelled)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                Tickets Open:{' '}
                                <strong className="font-mono text-cyan-700 dark:text-cyan-400">
                                  {tech.taskStatus.openTickets + tech.taskStatus.inProgressTickets}
                                </strong>{' '}
                                · Resolved:{' '}
                                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                                  {tech.taskStatus.resolvedTickets}
                                </strong>{' '}
                                · Sub-tasks:{' '}
                                <strong className="font-mono">
                                  {tech.taskStatus.tasksCompleted}/{tech.taskStatus.tasksTotal}
                                </strong>
                                {tech.taskStatus.overdueTickets > 0 && (
                                  <span className="ml-1.5 text-rose-600 dark:text-rose-400 font-bold">
                                    ({tech.taskStatus.overdueTickets} Overdue)
                                  </span>
                                )}
                              </div>
                            </div>
                            {(tech.taskStatus.recentTickets.length > 0 ||
                              (tech.taskStatus.assignedTasksList && tech.taskStatus.assignedTasksList.length > 0)) && (
                              <button
                                type="button"
                                onClick={() => setExpandedTechId(isExpanded ? null : tech.technicianId)}
                                className="p-1 rounded-lg neu-btn text-slate-500 hover:text-cyan-600 cursor-pointer"
                                title="View assigned tasks & ticket breakdown"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Ticket & Superadmin Assigned Task Status Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                          <td colSpan={8} className="px-6 py-4 space-y-4">
                            {tech.taskStatus.assignedTasksList && tech.taskStatus.assignedTasksList.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Superadmin-Assigned Operational Tasks ({tech.taskStatus.assignedTasksList.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {tech.taskStatus.assignedTasksList.map((at) => (
                                    <div
                                      key={at.id}
                                      className={`p-3 rounded-xl neu-card border text-[11px] space-y-1.5 ${
                                        at.status === 'cancelled'
                                          ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/40 dark:bg-rose-950/20'
                                          : at.status === 'completed'
                                            ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/15'
                                            : 'border-slate-200 dark:border-white/10'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <label className="flex items-start gap-2 cursor-pointer font-bold text-slate-900 dark:text-white">
                                          <input
                                            type="checkbox"
                                            checked={at.status === 'completed'}
                                            disabled={taskBusyId === at.id}
                                            onChange={() => handleToggleAssignedTask(at)}
                                            className="mt-0.5 rounded border-slate-300 text-emerald-600 cursor-pointer"
                                          />
                                          <span className={at.status === 'completed' ? 'line-through text-slate-500 dark:text-slate-400' : ''}>
                                            {at.subject}
                                          </span>
                                        </label>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                            at.status === 'completed'
                                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                              : at.status === 'cancelled'
                                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                          }`}
                                        >
                                          {at.status}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {at.description}
                                      </div>
                                      {at.status === 'cancelled' && at.cancelReason && (
                                        <div className="p-2 rounded-lg bg-rose-100/80 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/50 text-[10px] text-rose-800 dark:text-rose-200">
                                          <strong>Cancel Reason:</strong> {at.cancelReason}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {tech.taskStatus.recentTickets.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <TicketIcon className="w-3.5 h-3.5 text-cyan-500" />
                                  <span>Assigned Tickets &amp; Sub-task Status for {tech.technicianName}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {tech.taskStatus.recentTickets.map((tk) => (
                                    <div
                                      key={tk.id}
                                      className="p-2.5 rounded-xl neu-card border border-slate-200 dark:border-white/10 text-[11px] space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{tk.id}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                          {tk.status.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{tk.subject}</div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        Priority: {tk.priority} · Tasks: {tk.tasksCompleted}/{tk.tasksTotal} done
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Superadmin -> Technician Operational Task Assignment & Status Tracker */}
      <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Assign Operational Tasks to Technicians (Checklist &amp; Status Reports)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasks appear live in the technician&apos;s workspace with a completion checkbox and a mandatory Reason * field if cancelled. All statuses sync automatically into Daily &amp; Monthly reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 text-[11px]">
            {(['all', 'pending', 'completed', 'cancelled'] as const).map((tab) => {
              const count =
                tab === 'all'
                  ? assignedTasks.length
                  : assignedTasks.filter((t) => t.status === tab).length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTaskStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    taskStatusFilter === tab
                      ? 'neu-btn-primary shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Assign Task Form */}
          <form onSubmit={handleAssignTask} className="lg:col-span-5 neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-3 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Assign New Task to Technician</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assign to Technician *
              </label>
              <select
                value={newTaskTechId}
                onChange={(e) => setNewTaskTechId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs neu-select rounded-xl focus:outline-none font-semibold"
              >
                {technicianChoices.length === 0 ? (
                  <option value="">No technicians available</option>
                ) : (
                  technicianChoices.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} ({tc.email})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Task Subject *
              </label>
              <input
                type="text"
                required
                value={newTaskSubject}
                onChange={(e) => setNewTaskSubject(e.target.value)}
                placeholder="e.g. Perform Maintainance"
                className="w-full px-3 py-2 text-xs neu-input rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Instructions *
              </label>
              <textarea
                rows={3}
                required
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="e.g. Perform Server maintainance on saturday"
                className="w-full px-3 py-2 text-xs neu-input rounded-xl focus:outline-none resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs neu-select rounded-xl focus:outline-none font-semibold"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl font-mono focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={assigningTask || technicianChoices.length === 0}
              className="w-full neu-btn-primary py-2.5 text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{assigningTask ? 'Assigning Task...' : 'Assign Task to Technician'}</span>
            </button>
          </form>

          {/* Assigned Tasks List */}
          <div className="lg:col-span-7 space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
            {tasksLoading && assignedTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Loading assigned technician tasks...
              </div>
            ) : (
              (() => {
                const visibleTasks = assignedTasks.filter((t) =>
                  taskStatusFilter === 'all' ? true : t.status === taskStatusFilter
                );
                if (visibleTasks.length === 0) {
                  return (
                    <div className="p-8 rounded-xl neu-pressed text-center text-xs text-slate-500 dark:text-slate-400">
                      No {taskStatusFilter === 'all' ? '' : taskStatusFilter} tasks assigned yet. Create a task on the left to dispatch it immediately to a technician.
                    </div>
                  );
                }
                return visibleTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl neu-card border text-xs space-y-2 transition-all ${
                      task.status === 'cancelled'
                        ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/40 dark:bg-rose-950/20'
                        : task.status === 'completed'
                          ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/15'
                          : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          disabled={taskBusyId === task.id}
                          onChange={() => handleToggleAssignedTask(task)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 cursor-pointer shrink-0"
                          title="Tick to toggle Completed / Pending"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-bold text-slate-900 dark:text-white ${
                                task.status === 'completed' ? 'line-through text-slate-500 dark:text-slate-400' : ''
                              }`}
                            >
                              {task.subject}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                              {task.technicianName}
                            </span>
                            {task.priority && task.priority !== 'normal' && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                  task.priority === 'urgent'
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                    : task.priority === 'high'
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                            {task.description}
                          </p>
                        </div>
                      </label>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {task.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {task.status === 'cancelled' && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/50">
                              <Ban className="w-3 h-3" />
                              Cancelled
                            </span>
                            <button
                              type="button"
                              disabled={taskBusyId === task.id}
                              onClick={() => handleToggleAssignedTask(task)}
                              className="p-1 rounded-lg neu-btn text-slate-500 hover:text-cyan-600 cursor-pointer"
                              title="Reopen as Pending"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={taskBusyId === task.id}
                          onClick={() => handleDeleteAssignedTask(task)}
                          className="p-1 rounded-lg neu-btn text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {task.status === 'cancelled' && task.cancelReason && (
                      <div className="p-2.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/50 text-[11px] text-rose-800 dark:text-rose-200">
                        <strong>Cancel Reason:</strong> {task.cancelReason}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-white/5">
                      <span>Assigned: {new Date(task.assignedAt).toLocaleString()}</span>
                      {task.dueDate && <span>Due: {task.dueDate}</span>}
                      {task.completedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Completed: {new Date(task.completedAt).toLocaleString()}
                        </span>
                      )}
                      {task.cancelledAt && (
                        <span className="text-rose-600 dark:text-rose-400">
                          Cancelled: {new Date(task.cancelledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      </div>

      {/* Scheduled Email Report Configuration (Helpdesk -> Superadmin Email) */}
      <form
        onSubmit={handleSaveSchedule}
        className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Scheduled Email Reports: Daily &amp; Monthly Attendance + Task Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically email technician working hours, break logs, overtime alerts, and ticket/task status from the Helpdesk Gateway to Superadmin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              schedule.enabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                : 'neu-btn text-slate-600 dark:text-slate-300 border-slate-300 dark:border-white/10'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{schedule.enabled ? 'Schedule ACTIVE (ON)' : 'Schedule PAUSED (OFF)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="lg:col-span-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Superadmin Recipient Email *
            </label>
            <input
              type="email"
              required
              value={schedule.recipientEmail}
              onChange={(e) => setSchedule((prev) => ({ ...prev, recipientEmail: e.target.value }))}
              placeholder="admin@lakhanglobal.com"
              className="w-full px-3 py-2 text-xs neu-input rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Report Schedule Frequency
            </label>
            <select
              value={schedule.frequency}
              onChange={(e) => setSchedule((prev) => ({ ...prev, frequency: e.target.value as any }))}
              className="w-full px-3 py-2 text-xs neu-select rounded-xl focus:outline-none font-semibold"
            >
              <option value="daily">Daily Report</option>
              <option value="monthly">Monthly Summary Report</option>
              <option value="both">Both (Daily + Monthly)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Daily Dispatch Time
            </label>
            <input
              type="time"
              value={schedule.dailySendTime}
              onChange={(e) => setSchedule((prev) => ({ ...prev, dailySendTime: e.target.value }))}
              className="w-full px-3 py-2 text-xs neu-input rounded-xl font-mono focus:outline-none"
            />
          </div>

          {(schedule.frequency === 'monthly' || schedule.frequency === 'both') && (
            <>
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Monthly Send Day (1–28)
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={schedule.monthlyDayOfMonth}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, monthlyDayOfMonth: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Monthly Dispatch Time
                </label>
                <input
                  type="time"
                  value={schedule.monthlySendTime}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, monthlySendTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl font-mono focus:outline-none"
                />
              </div>
            </>
          )}

          {/* CC Recipients */}
          <div className="md:col-span-2 lg:col-span-4 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              CC Emails (Optional — comma-separated or add multiple recipients)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCcFromInput();
                  }
                }}
                placeholder="ops-lead@company.com, hr@company.com"
                className="flex-1 px-3 py-2 text-xs neu-input rounded-xl focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCcFromInput}
                className="neu-btn px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Add CC</span>
              </button>
            </div>
            {(schedule.ccEmails || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {(schedule.ccEmails || []).map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCc(email)}
                      className="text-slate-500 hover:text-rose-500 cursor-pointer"
                      title={`Remove ${email}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={schedule.includeTaskStatus}
              onChange={(e) => setSchedule((prev) => ({ ...prev, includeTaskStatus: e.target.checked }))}
              className="rounded border-slate-300 text-cyan-600 cursor-pointer"
            />
            <span>Include Assigned Tasks, Cancel Reasons &amp; Ticket Status</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={schedule.includeOvertimeDetails}
              onChange={(e) => setSchedule((prev) => ({ ...prev, includeOvertimeDetails: e.target.checked }))}
              className="rounded border-slate-300 text-cyan-600 cursor-pointer"
            />
            <span>Include Overtime Hours &amp; Target Comparison</span>
          </label>
        </div>

        {schedule.lastSendStatus && (
          <div className="p-3 rounded-xl neu-pressed text-[11px] font-mono text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <span>Last Dispatch Status: <strong>{schedule.lastSendStatus}</strong></span>
            {schedule.lastSentAt && (
              <span className="text-slate-500">
                Timestamp: {new Date(schedule.lastSentAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={sendingReport !== null}
              onClick={() => handleSendReportNow('daily')}
              className="neu-btn px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{sendingReport === 'daily' ? 'Sending Daily...' : 'Send Daily Report Now'}</span>
            </button>
            <button
              type="button"
              disabled={sendingReport !== null}
              onClick={() => handleSendReportNow('monthly')}
              className="neu-btn px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{sendingReport === 'monthly' ? 'Sending Monthly...' : 'Send Monthly Report Now'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={scheduleSaving}
            className="neu-btn-primary px-5 py-2.5 text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{scheduleSaving ? 'Saving Schedule...' : 'Save Email Schedule Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
