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
  UserPlus,
  UserMinus,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AttendanceReportSchedule,
  TechnicianAttendanceOverviewItem,
  TechnicianAssignedTask,
  User,
} from '../types';
import { api } from '../services/api';
import { formatHMS, formatHM, isUserAttendanceEligible } from './TechnicianShiftTimer';

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
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [reportViewMode, setReportViewMode] = useState<'summary' | 'detailed'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const reportSectionRef = React.useRef<HTMLDivElement | null>(null);
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

  // Enroll / Add other system users into Tech Attendance & OT
  const [selectedEnrollUserId, setSelectedEnrollUserId] = useState('');
  const [enrollWorkHours, setEnrollWorkHours] = useState('8');
  const [enrollShiftLabel, setEnrollShiftLabel] = useState('');
  const [enrollingUser, setEnrollingUser] = useState(false);

  // Email Scheduler state
  const [schedule, setSchedule] = useState<AttendanceReportSchedule>({
    enabled: false,
    frequency: 'daily',
    recipientEmail: superadminEmail,
    ccEmails: [],
    selectedTechnicianIds: [],
    dailySendTime: '19:00',
    monthlyDayOfMonth: 1,
    monthlySendTime: '09:00',
    includeTaskStatus: true,
    includeOvertimeDetails: true,
  });
  const [selectedEmailStaffIds, setSelectedEmailStaffIds] = useState<string[]>([]);
  const [emailStaffInitialized, setEmailStaffInitialized] = useState(false);
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
        const savedIds = Array.isArray(s.selectedTechnicianIds) ? s.selectedTechnicianIds : [];
        setSchedule({
          ...s,
          ccEmails: Array.isArray(s.ccEmails) ? s.ccEmails : [],
          selectedTechnicianIds: savedIds,
        });
        if (savedIds.length > 0) {
          setSelectedEmailStaffIds(savedIds);
          setEmailStaffInitialized(true);
        }
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
    ? overview.technicians.map((t) => ({
        id: t.technicianId,
        name: t.technicianName,
        email: t.technicianEmail,
        role: t.role,
      }))
    : users
        .filter((u) => isUserAttendanceEligible(u))
        .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));

  const enrolledIds = new Set(technicianChoices.map((t) => t.id));
  const roleOrder: Record<string, number> = {
    inventory_manager: 1,
    manager: 2,
    auditor: 3,
    technician: 4,
    admin: 5,
    superadmin: 6,
    requester: 7,
  };
  const nonEnrolledUsers = [...users]
    .filter((u) => !enrolledIds.has(u.id))
    .sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));

  useEffect(() => {
    if (!newTaskTechId && technicianChoices.length > 0) {
      setNewTaskTechId(technicianChoices[0].id);
    }
  }, [newTaskTechId, technicianChoices]);

  useEffect(() => {
    if (nonEnrolledUsers.length === 0) {
      if (selectedEnrollUserId) setSelectedEnrollUserId('');
    } else if (!nonEnrolledUsers.some((u) => u.id === selectedEnrollUserId)) {
      setSelectedEnrollUserId(nonEnrolledUsers[0].id);
    }
  }, [nonEnrolledUsers, selectedEnrollUserId]);

  useEffect(() => {
    if (!emailStaffInitialized && technicianChoices.length > 0) {
      setSelectedEmailStaffIds(technicianChoices.map((t) => t.id));
      setEmailStaffInitialized(true);
    }
  }, [emailStaffInitialized, technicianChoices]);

  useEffect(() => {
    if (selectedStaffFilter !== 'all' && technicianChoices.length > 0 && !technicianChoices.some((t) => t.id === selectedStaffFilter)) {
      setSelectedStaffFilter('all');
    }
  }, [selectedStaffFilter, technicianChoices]);

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

  const handleEnrollUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollUserId) return;
    const hrs = Number(enrollWorkHours);
    if (isNaN(hrs) || hrs < 0.5 || hrs > 24) {
      showBanner('error', 'Work hours per day must be between 0.5 and 24.');
      return;
    }
    setEnrollingUser(true);
    try {
      const res = await api.setUserAttendanceEnrollment(selectedEnrollUserId, {
        attendanceEnabled: true,
        assignedWorkHoursPerDay: hrs,
        assignedShiftLabel: enrollShiftLabel.trim() || undefined,
      });
      setEnrollShiftLabel('');
      showBanner('success', res.message || 'User added to Tech Attendance & OT.');
      await fetchOverview();
      onUserWorkHoursUpdated?.();
    } catch (err: any) {
      showBanner('error', err.message || 'Failed adding user to Tech Attendance & OT');
    } finally {
      setEnrollingUser(false);
    }
  };

  const handleRemoveEnrolledUser = async (tech: TechnicianAttendanceOverviewItem) => {
    setEnrollingUser(true);
    try {
      const res = await api.setUserAttendanceEnrollment(tech.technicianId, {
        attendanceEnabled: false,
      });
      showBanner('success', res.message || `Removed ${tech.technicianName} from Tech Attendance & OT.`);
      await fetchOverview();
      onUserWorkHoursUpdated?.();
    } catch (err: any) {
      showBanner('error', err.message || 'Failed removing user from Tech Attendance & OT');
    } finally {
      setEnrollingUser(false);
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

  const handleToggleEmailStaff = (staffId: string) => {
    setEmailStaffInitialized(true);
    setSelectedEmailStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule.recipientEmail || !schedule.recipientEmail.includes('@')) {
      showBanner('error', 'Please enter a valid Superadmin recipient email address.');
      return;
    }
    const validSelectedIds = selectedEmailStaffIds.filter((id) => enrolledIds.has(id));
    if (validSelectedIds.length === 0) {
      showBanner('error', 'Please tick at least one staff member to include in the scheduled email report.');
      return;
    }
    const mergedCc = getMergedCcList();
    setScheduleSaving(true);
    try {
      const saved = await api.updateAttendanceSchedule({
        ...schedule,
        ccEmails: mergedCc,
        selectedTechnicianIds: validSelectedIds,
      });
      setSchedule(saved);
      if (Array.isArray(saved.selectedTechnicianIds) && saved.selectedTechnicianIds.length > 0) {
        setSelectedEmailStaffIds(saved.selectedTechnicianIds);
      }
      setCcInput('');
      showBanner(
        'success',
        saved.enabled
          ? `Automated ${saved.frequency.toUpperCase()} attendance & task report emails scheduled for ${validSelectedIds.length} staff member(s) to ${saved.recipientEmail}${saved.ccEmails && saved.ccEmails.length ? ` (CC: ${saved.ccEmails.join(', ')})` : ''}.`
          : `Automated attendance email scheduler saved for ${validSelectedIds.length} staff member(s) (currently paused/OFF).`
      );
    } catch (err: any) {
      showBanner('error', err.message || 'Failed saving email schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleSendReportNow = async (freq: 'daily' | 'monthly') => {
    const validSelectedIds = selectedEmailStaffIds.filter((id) => enrolledIds.has(id));
    if (validSelectedIds.length === 0) {
      showBanner('error', 'Please tick at least one staff member before sending the email report.');
      return;
    }
    const mergedCc = getMergedCcList();
    setSendingReport(freq);
    try {
      const res = await api.sendAttendanceReportNow({
        frequency: freq,
        recipientEmail: schedule.recipientEmail,
        ccEmails: mergedCc,
        technicianIds: validSelectedIds,
        date: selectedDate,
        month: selectedMonth,
      });
      await fetchSchedule();
      showBanner(
        'success',
        `${freq === 'daily' ? 'Daily' : 'Monthly'} report for ${validSelectedIds.length} selected staff dispatched to ${res.recipient}${res.cc && res.cc.length ? ` (CC: ${res.cc.join(', ')})` : ''} (${res.status === 'sent' ? 'Sent via SMTP' : 'Recorded via Gateway Log'}).`
      );
    } catch (err: any) {
      showBanner('error', err.message || `Failed dispatching ${freq} report`);
    } finally {
      setSendingReport(null);
    }
  };

  const filteredTechs = (overview?.technicians || []).filter((t) => {
    if (selectedStaffFilter !== 'all' && t.technicianId !== selectedStaffFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.technicianName.toLowerCase().includes(q) ||
      t.technicianEmail.toLowerCase().includes(q) ||
      (t.employeeCode && t.employeeCode.toLowerCase().includes(q)) ||
      t.role.toLowerCase().includes(q)
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
      acc.days += t.daysWorked;
      acc.target += t.expectedTargetSeconds;
      acc.assignedDone += t.taskStatus.assignedTasksCompleted ?? 0;
      acc.assignedTotal += t.taskStatus.assignedTasksTotal ?? 0;
      acc.assignedPending += t.taskStatus.assignedTasksPending ?? 0;
      acc.assignedCancelled += t.taskStatus.assignedTasksCancelled ?? 0;
      acc.ticketsOpen += t.taskStatus.openTickets + t.taskStatus.inProgressTickets;
      acc.ticketsResolved += t.taskStatus.resolvedTickets;
      return acc;
    },
    {
      work: 0,
      brk: 0,
      ot: 0,
      otCount: 0,
      days: 0,
      target: 0,
      assignedDone: 0,
      assignedTotal: 0,
      assignedPending: 0,
      assignedCancelled: 0,
      ticketsOpen: 0,
      ticketsResolved: 0,
    }
  );

  // Build Day-by-Day rows (monthly) or Shift Session rows (daily) for Detailed Report table
  const monthlyDetailedRows = filteredTechs.flatMap((tech) =>
    (tech.dailyBreakdown || []).map((day) => ({
      tech,
      day,
    }))
  ).sort((a, b) => b.day.date.localeCompare(a.day.date) || a.tech.technicianName.localeCompare(b.tech.technicianName));

  const dailySessionRows = filteredTechs.flatMap((tech) =>
    (tech.sessions || []).map((session, idx) => {
      const isLive = session.status === 'working' || session.status === 'on_break';
      const liveWorkSec = session.status === 'working' ? session.totalWorkSeconds + deltaSeconds : session.totalWorkSeconds;
      const liveBreakSec = session.status === 'on_break' ? session.totalBreakSeconds + deltaSeconds : session.totalBreakSeconds;
      const targetSec = Math.round((session.assignedWorkHours || tech.assignedWorkHoursPerDay || 8) * 3600);
      const liveOtSec = Math.max(0, liveWorkSec - targetSec);
      return {
        tech,
        session,
        sessionNumber: idx + 1,
        isLive,
        liveWorkSec,
        liveBreakSec,
        targetSec,
        liveOtSec,
      };
    })
  ).sort((a, b) => new Date(b.session.startTime).getTime() - new Date(a.session.startTime).getTime());

  const handleOpenStaffReport = (techId: string) => {
    setSelectedStaffFilter(techId);
    setReportViewMode(period === 'monthly' ? 'detailed' : 'summary');
    setTimeout(() => {
      reportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleExportWorkReportCsv = () => {
    const csvEscape = (val: unknown) => {
      const s = String(val ?? '');
      return `"${s.replace(/"/g, '""')}"`;
    };

    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportViewMode === 'summary') {
      headers = [
        'Period',
        'Staff Name',
        'Role',
        'Employee Code',
        'Email',
        'Status',
        'Days Worked',
        'Shifts',
        'First Clock In',
        'Last Clock Out',
        'Assigned Hrs/Day',
        'Period Target',
        'Net Working Time',
        'Break Time',
        'Overtime',
        'Assigned Tasks Completed',
        'Assigned Tasks Pending',
        'Assigned Tasks Cancelled',
        'Tickets Open',
        'Tickets Resolved',
      ];
      rows = filteredTechs.map((tech) => {
        const live = getLiveTechMetrics(tech);
        return [
          period === 'daily' ? selectedDate : selectedMonth,
          tech.technicianName,
          tech.role,
          tech.employeeCode || '',
          tech.technicianEmail,
          tech.currentStatus,
          String(tech.daysWorked),
          String(tech.sessions.length),
          tech.firstClockIn ? new Date(tech.firstClockIn).toLocaleString() : '—',
          tech.currentStatus === 'working' || tech.currentStatus === 'on_break'
            ? 'Active'
            : tech.lastClockOut
              ? new Date(tech.lastClockOut).toLocaleString()
              : '—',
          `${tech.assignedWorkHoursPerDay}h`,
          formatHM(tech.expectedTargetSeconds),
          formatHM(live.workSec),
          formatHM(live.breakSec),
          live.otSec > 0 ? `+${formatHM(live.otSec)}` : '0m',
          String(tech.taskStatus.assignedTasksCompleted ?? 0),
          String(tech.taskStatus.assignedTasksPending ?? 0),
          String(tech.taskStatus.assignedTasksCancelled ?? 0),
          String(tech.taskStatus.openTickets + tech.taskStatus.inProgressTickets),
          String(tech.taskStatus.resolvedTickets),
        ];
      });
    } else if (period === 'monthly') {
      headers = [
        'Date',
        'Staff Name',
        'Role',
        'Employee Code',
        'Shifts Count',
        'First Clock In',
        'Last Clock Out',
        'Daily Target',
        'Net Working Time',
        'Break Time',
        'Overtime',
        'Status',
        'Shift Notes',
      ];
      rows = monthlyDetailedRows.map(({ tech, day }) => [
        day.date,
        tech.technicianName,
        tech.role,
        tech.employeeCode || '',
        String(day.sessionsCount),
        day.firstClockIn ? new Date(day.firstClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        day.status === 'working' || day.status === 'on_break'
          ? 'Active'
          : day.lastClockOut
            ? new Date(day.lastClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—',
        formatHM(day.targetSeconds),
        formatHM(day.totalWorkSeconds),
        formatHM(day.totalBreakSeconds),
        day.overtimeSeconds > 0 ? `+${formatHM(day.overtimeSeconds)}` : '0m',
        day.status,
        day.notes || '',
      ]);
    } else {
      headers = [
        'Date',
        'Staff Name',
        'Role',
        'Employee Code',
        'Clock In',
        'Clock Out',
        'Breaks Count',
        'Break Time',
        'Target Hours',
        'Net Working Time',
        'Overtime',
        'Status',
        'Notes',
      ];
      rows = dailySessionRows.map(({ tech, session, liveWorkSec, liveBreakSec, targetSec, liveOtSec }) => [
        session.date,
        tech.technicianName,
        tech.role,
        tech.employeeCode || '',
        new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        session.stopTime ? new Date(session.stopTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
        String(session.breaks?.length || 0),
        formatHM(liveBreakSec),
        formatHM(targetSec),
        formatHM(liveWorkSec),
        liveOtSec > 0 ? `+${formatHM(liveOtSec)}` : '0m',
        session.status,
        session.notes || '',
      ]);
    }

    const csv = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const staffLabel = selectedStaffFilter === 'all'
      ? 'all-staff'
      : (technicianChoices.find((t) => t.id === selectedStaffFilter)?.name || 'staff').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.href = url;
    link.download = `work-report-${period}-${period === 'daily' ? selectedDate : selectedMonth}-${staffLabel}-${reportViewMode}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

          <select
            value={selectedStaffFilter}
            onChange={(e) => setSelectedStaffFilter(e.target.value)}
            className="px-3 py-1.5 text-xs neu-select rounded-xl focus:outline-none font-semibold max-w-[230px]"
            title="View report for All Staffs or a specific staff member"
          >
            <option value="all">All Enrolled Staff ({technicianChoices.length})</option>
            {technicianChoices.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.name} ({tc.role.replace(/_/g, ' ')})
              </option>
            ))}
          </select>

          {selectedStaffFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedStaffFilter('all')}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl neu-btn text-cyan-700 dark:text-cyan-400 cursor-pointer"
            >
              Show All Staff
            </button>
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

      {/* Main Staff & Technician Working Time, Custom Work Hours & Overtime Table */}
      <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Staff &amp; Technician Working Time, Custom Work Hours &amp; Overtime Monitor
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Applies to all Staff &amp; Technicians by default, plus any additional users added by Super Admin (Inventory Manager, Team Manager, Auditor, etc.).
            </p>
          </div>

          {nonEnrolledUsers.length > 0 && (
            <form onSubmit={handleEnrollUser} className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedEnrollUserId}
                onChange={(e) => setSelectedEnrollUserId(e.target.value)}
                className="px-2.5 py-1.5 text-xs neu-select rounded-xl focus:outline-none font-semibold max-w-[260px]"
                title="Select another user (e.g. Inventory Manager, Team Manager, Auditor) to add to Tech Attendance & OT"
              >
                {nonEnrolledUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role.replace(/_/g, ' ')} ({u.email})
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={enrollWorkHours}
                  onChange={(e) => setEnrollWorkHours(e.target.value)}
                  className="w-16 px-2 py-1.5 text-xs neu-input rounded-xl font-mono font-bold"
                  title="Assigned daily work hours"
                />
                <span className="text-[10px] text-slate-500 font-semibold">h/day</span>
              </div>
              <button
                type="submit"
                disabled={enrollingUser || !selectedEnrollUserId}
                className="neu-btn-primary px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{enrollingUser ? 'Adding...' : 'Add User to Attendance & OT'}</span>
              </button>
            </form>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Staff / Technician</th>
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
                    No staff or technicians match your search criteria.
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
                        {/* Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                              {tech.technicianName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>{tech.technicianName}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                                  {tech.role.replace(/_/g, ' ')}
                                </span>
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
                            <div className="flex items-center gap-1.5">
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
                              <button
                                type="button"
                                disabled={enrollingUser}
                                onClick={() => handleRemoveEnrolledUser(tech)}
                                className="p-1.5 rounded-lg neu-btn text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer disabled:opacity-50"
                                title={`Remove ${tech.technicianName} from Tech Attendance & OT`}
                              >
                                <UserMinus className="w-3.5 h-3.5" />
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
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenStaffReport(tech.technicianId)}
                                className="px-2 py-1 rounded-lg neu-btn text-[10px] font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1 cursor-pointer"
                                title={`View ${tech.technicianName}'s Daily & Monthly Work Report Table`}
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>Report</span>
                              </button>
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

      {/* Staff Daily & Monthly Work Report (Table Format) */}
      <div
        ref={reportSectionRef}
        id="staff-work-report-table"
        className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Staff Work Report — {period === 'daily' ? `Daily (${selectedDate})` : `Monthly (${selectedMonth})`}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedStaffFilter === 'all'
                  ? `Showing tabular work report for all ${filteredTechs.length} matching staff members.`
                  : `Showing tabular work report for ${filteredTechs[0]?.technicianName || 'selected staff member'}.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="px-3 py-1.5 text-xs neu-select rounded-xl focus:outline-none font-semibold max-w-[220px]"
              aria-label="Staff Work Report Filter"
            >
              <option value="all">All Enrolled Staff ({technicianChoices.length})</option>
              {technicianChoices.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name} — {tc.role.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/70 border border-slate-300 dark:border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setReportViewMode('summary')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  reportViewMode === 'summary'
                    ? 'neu-btn-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Staff Summary
              </button>
              <button
                type="button"
                onClick={() => setReportViewMode('detailed')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  reportViewMode === 'detailed'
                    ? 'neu-btn-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period === 'monthly' ? 'Day-by-Day Table' : 'Shift Logs Table'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportWorkReportCsv}
              className="neu-btn px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Download this work report table as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {reportViewMode === 'summary' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Days / Shifts</th>
                  <th className="py-3 px-3">First In / Last Out</th>
                  <th className="py-3 px-3 text-right">Target</th>
                  <th className="py-3 px-3 text-right">Net Worked</th>
                  <th className="py-3 px-3 text-right">Break Time</th>
                  <th className="py-3 px-3 text-right">Overtime</th>
                  <th className="py-3 px-4 text-right">Tasks &amp; Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredTechs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No staff match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTechs.map((tech) => {
                    const live = getLiveTechMetrics(tech);
                    return (
                      <tr key={tech.technicianId} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{tech.technicianName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {tech.employeeCode || tech.technicianId} · {tech.role.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {period === 'daily' ? selectedDate : selectedMonth}
                        </td>
                        <td className="py-3 px-3 font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {tech.currentStatus.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {tech.daysWorked}d / {tech.sessions.length}s
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                          {tech.firstClockIn
                            ? new Date(tech.firstClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}{' '}
                          /{' '}
                          {tech.currentStatus === 'working' || tech.currentStatus === 'on_break'
                            ? 'Active'
                            : tech.lastClockOut
                              ? new Date(tech.lastClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {formatHM(tech.expectedTargetSeconds)}
                          <span className="text-[10px] text-slate-400"> ({tech.assignedWorkHoursPerDay}h/d)</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
                          {tech.currentStatus === 'working' ? formatHMS(live.workSec) : formatHM(live.workSec)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                          {tech.currentStatus === 'on_break' ? formatHMS(live.breakSec) : formatHM(live.breakSec)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                          {live.isOvertime ? (
                            <span className="text-rose-600 dark:text-rose-400">+{formatHM(live.otSec)}</span>
                          ) : (
                            <span className="text-slate-400">0m</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[11px] text-slate-700 dark:text-slate-300">
                          <div>
                            Tasks: <strong>{tech.taskStatus.assignedTasksCompleted}/{tech.taskStatus.assignedTasksTotal}</strong>
                            {tech.taskStatus.assignedTasksCancelled > 0 ? ` (${tech.taskStatus.assignedTasksCancelled} canc.)` : ''}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Tickets: {tech.taskStatus.openTickets + tech.taskStatus.inProgressTickets} open · {tech.taskStatus.resolvedTickets} resolved
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredTechs.length > 0 && (
                <tfoot className="bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-300 dark:border-white/15 font-bold text-slate-900 dark:text-white">
                  <tr>
                    <td className="py-3 px-4" colSpan={3}>
                      Total ({filteredTechs.length} Staff)
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {liveTotals.days}d
                    </td>
                    <td className="py-3 px-3 text-slate-400">—</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatHM(liveTotals.target)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-cyan-700 dark:text-cyan-400">
                      {formatHM(liveTotals.work)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {formatHM(liveTotals.brk)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      {liveTotals.ot > 0 ? `+${formatHM(liveTotals.ot)}` : '0m'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[11px]">
                      {liveTotals.assignedDone}/{liveTotals.assignedTotal} tasks · {liveTotals.ticketsResolved} resolved
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : period === 'monthly' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Staff Member</th>
                  <th className="py-3 px-3 text-right">Shifts</th>
                  <th className="py-3 px-3">Clock In / Out</th>
                  <th className="py-3 px-3 text-right">Daily Target</th>
                  <th className="py-3 px-3 text-right">Net Worked</th>
                  <th className="py-3 px-3 text-right">Break Time</th>
                  <th className="py-3 px-3 text-right">Daily OT</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {monthlyDetailedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                      <div>No shift logs recorded for {selectedMonth} matching the current staff filter.</div>
                      <button
                        type="button"
                        onClick={() => setReportViewMode('summary')}
                        className="px-3 py-1 rounded-lg neu-btn text-xs font-bold text-cyan-700 dark:text-cyan-400 cursor-pointer"
                      >
                        Switch to Staff Summary View
                      </button>
                    </td>
                  </tr>
                ) : (
                  monthlyDetailedRows.map(({ tech, day }) => (
                    <tr key={`${tech.technicianId}-${day.date}`} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {day.date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{tech.technicianName}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {tech.employeeCode || tech.technicianId} · {tech.role.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {day.sessionsCount}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                        {day.firstClockIn ? new Date(day.firstClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        {' / '}
                        {day.status === 'working' || day.status === 'on_break'
                          ? 'Active'
                          : day.lastClockOut
                            ? new Date(day.lastClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatHM(day.targetSeconds)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
                        {formatHM(day.totalWorkSeconds)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {formatHM(day.totalBreakSeconds)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                        {day.isOvertime ? (
                          <span className="text-rose-600 dark:text-rose-400">+{formatHM(day.overtimeSeconds)}</span>
                        ) : (
                          <span className="text-slate-400">0m</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {day.status.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] truncate">
                        {day.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Staff Member</th>
                  <th className="py-3 px-3">Clock In</th>
                  <th className="py-3 px-3">Clock Out</th>
                  <th className="py-3 px-3 text-right">Breaks</th>
                  <th className="py-3 px-3 text-right">Target</th>
                  <th className="py-3 px-3 text-right">Net Worked</th>
                  <th className="py-3 px-3 text-right">Overtime</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Shift Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {dailySessionRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                      <div>No shift sessions logged on {selectedDate} for the selected staff filter.</div>
                      <button
                        type="button"
                        onClick={() => setReportViewMode('summary')}
                        className="px-3 py-1 rounded-lg neu-btn text-xs font-bold text-cyan-700 dark:text-cyan-400 cursor-pointer"
                      >
                        Switch to Staff Summary View
                      </button>
                    </td>
                  </tr>
                ) : (
                  dailySessionRows.map(({ tech, session, isLive, liveWorkSec, liveBreakSec, targetSec, liveOtSec }) => (
                    <tr key={session.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {session.date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{tech.technicianName}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {tech.employeeCode || tech.technicianId} · {tech.role.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {session.stopTime
                          ? new Date(session.stopTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Active'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {session.breaks?.length || 0} ({isLive && session.status === 'on_break' ? formatHMS(liveBreakSec) : formatHM(liveBreakSec)})
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatHM(targetSec)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
                        {isLive && session.status === 'working' ? formatHMS(liveWorkSec) : formatHM(liveWorkSec)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                        {liveOtSec > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">+{formatHM(liveOtSec)}</span>
                        ) : (
                          <span className="text-slate-400">0m</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {session.status.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] truncate">
                        {session.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
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
                Assign to Staff / Technician *
              </label>
              <select
                value={newTaskTechId}
                onChange={(e) => setNewTaskTechId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs neu-select rounded-xl focus:outline-none font-semibold"
              >
                {technicianChoices.length === 0 ? (
                  <option value="">No enrolled staff available</option>
                ) : (
                  technicianChoices.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} — {tc.role.replace(/_/g, ' ')} ({tc.email})
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

        <div className="space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Include Specific Staff in Scheduled &amp; Manual Emails *
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tick the staff members whose working hours, overtime, and task status should be emailed ({selectedEmailStaffIds.filter((id) => enrolledIds.has(id)).length} of {technicianChoices.length} ticked).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmailStaffInitialized(true);
                  setSelectedEmailStaffIds(technicianChoices.map((t) => t.id));
                }}
                className="neu-btn px-2.5 py-1 text-[11px] font-bold rounded-lg text-cyan-700 dark:text-cyan-400 cursor-pointer"
              >
                Tick All ({technicianChoices.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailStaffInitialized(true);
                  setSelectedEmailStaffIds([]);
                }}
                className="neu-btn px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {technicianChoices.map((tc) => {
              const isChecked = selectedEmailStaffIds.includes(tc.id);
              return (
                <label
                  key={tc.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleEmailStaff(tc.id)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-cyan-600 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {tc.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {tc.role.replace(/_/g, ' ')} · {tc.email}
                    </div>
                  </div>
                </label>
              );
            })}
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
