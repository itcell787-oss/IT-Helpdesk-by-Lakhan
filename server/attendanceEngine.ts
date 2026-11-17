import { db } from './db';
import {
  User,
  TechnicianAttendanceSession,
  TechnicianAttendanceOverviewItem,
  BreakInterval,
} from '../src/types';

export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalMonthKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatDurationHM(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function formatDurationHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Dynamically computes live net work seconds and break seconds for a session.
 * - While status === 'working', work timer ticks forward cleanly excluding past breaks.
 * - While status === 'on_break', work timer pauses at the moment the break started and break timer ticks forward.
 * - While status === 'stopped', both timers are frozen at stopTime.
 */
export function computeSessionDurations(
  session: TechnicianAttendanceSession,
  nowMs: number = Date.now(),
  customAssignedHours?: number
): {
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  overtimeSeconds: number;
} {
  const startMs = new Date(session.startTime).getTime();
  if (isNaN(startMs)) {
    return {
      totalWorkSeconds: session.totalWorkSeconds || 0,
      totalBreakSeconds: session.totalBreakSeconds || 0,
      overtimeSeconds: session.overtimeSeconds || 0,
    };
  }

  let closedBreakSeconds = 0;
  let openBreakStartMs: number | null = null;
  let activeBreakSeconds = 0;

  for (const br of session.breaks || []) {
    if (br.endTime) {
      const bStart = new Date(br.startTime).getTime();
      const bEnd = new Date(br.endTime).getTime();
      const dur = !isNaN(bStart) && !isNaN(bEnd)
        ? Math.max(0, Math.floor((bEnd - bStart) / 1000))
        : (br.durationSeconds || 0);
      closedBreakSeconds += dur;
    } else if (br.startTime) {
      const bStart = new Date(br.startTime).getTime();
      if (!isNaN(bStart)) {
        openBreakStartMs = bStart;
        const endRef = session.status === 'stopped' && session.stopTime
          ? new Date(session.stopTime).getTime()
          : nowMs;
        activeBreakSeconds += Math.max(0, Math.floor((endRef - bStart) / 1000));
      }
    }
  }

  let workEndMs = nowMs;
  if (session.status === 'stopped' && session.stopTime) {
    const parsedStop = new Date(session.stopTime).getTime();
    if (!isNaN(parsedStop)) workEndMs = parsedStop;
  } else if (session.status === 'on_break' && openBreakStartMs !== null) {
    workEndMs = openBreakStartMs;
  }

  const grossSeconds = Math.max(0, Math.floor((workEndMs - startMs) / 1000));
  const totalWorkSeconds = Math.max(0, grossSeconds - closedBreakSeconds);
  const totalBreakSeconds = closedBreakSeconds + activeBreakSeconds;

  const targetHours = customAssignedHours ?? session.assignedWorkHours ?? 8;
  const targetSeconds = Math.max(0, Math.round(targetHours * 3600));
  const overtimeSeconds = Math.max(0, totalWorkSeconds - targetSeconds);

  return {
    totalWorkSeconds,
    totalBreakSeconds,
    overtimeSeconds,
  };
}

export function startShiftTimer(
  user: User,
  notes?: string,
  now: Date = new Date()
): TechnicianAttendanceSession {
  const sessions = db.get('attendanceSessions') || [];
  const existingActive = sessions.find(
    (s) => s.technicianId === user.id && (s.status === 'working' || s.status === 'on_break')
  );
  if (existingActive) {
    return existingActive;
  }

  const assignedHours = user.assignedWorkHoursPerDay && user.assignedWorkHoursPerDay > 0
    ? user.assignedWorkHoursPerDay
    : 8;

  const newSession: TechnicianAttendanceSession = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    technicianId: user.id,
    technicianName: user.name,
    technicianEmail: user.email,
    employeeCode: user.employeeCode,
    date: getLocalDateKey(now),
    status: 'working',
    startTime: now.toISOString(),
    breaks: [],
    totalWorkSeconds: 0,
    totalBreakSeconds: 0,
    assignedWorkHours: assignedHours,
    overtimeSeconds: 0,
    notes: notes?.trim() || undefined,
    updatedAt: now.toISOString(),
  };

  db.set('attendanceSessions', [newSession, ...sessions]);
  return newSession;
}

export function startBreakTimer(
  user: User,
  reason?: string,
  now: Date = new Date()
): TechnicianAttendanceSession {
  const sessions = db.get('attendanceSessions') || [];
  const idx = sessions.findIndex(
    (s) => s.technicianId === user.id && (s.status === 'working' || s.status === 'on_break')
  );

  if (idx === -1) {
    throw new Error('No active shift timer found. Please start your work timer first.');
  }

  const session = { ...sessions[idx] };
  if (session.status === 'on_break') {
    return session;
  }

  const newBreak: BreakInterval = {
    id: `brk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    startTime: now.toISOString(),
    durationSeconds: 0,
    reason: reason?.trim() || 'Scheduled Break',
  };

  session.breaks = [...(session.breaks || []), newBreak];
  session.status = 'on_break';
  const durations = computeSessionDurations(session, now.getTime(), user.assignedWorkHoursPerDay || session.assignedWorkHours);
  session.totalWorkSeconds = durations.totalWorkSeconds;
  session.totalBreakSeconds = durations.totalBreakSeconds;
  session.overtimeSeconds = durations.overtimeSeconds;
  session.updatedAt = now.toISOString();

  sessions[idx] = session;
  db.set('attendanceSessions', sessions);
  return session;
}

export function stopBreakTimer(
  user: User,
  now: Date = new Date()
): TechnicianAttendanceSession {
  const sessions = db.get('attendanceSessions') || [];
  const idx = sessions.findIndex(
    (s) => s.technicianId === user.id && s.status === 'on_break'
  );

  if (idx === -1) {
    throw new Error('No active break timer is currently running.');
  }

  const session = { ...sessions[idx] };
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  session.breaks = (session.breaks || []).map((br) => {
    if (!br.endTime) {
      const bStart = new Date(br.startTime).getTime();
      const dur = !isNaN(bStart) ? Math.max(0, Math.floor((nowMs - bStart) / 1000)) : 0;
      return {
        ...br,
        endTime: nowIso,
        durationSeconds: dur,
      };
    }
    return br;
  });

  session.status = 'working';
  const durations = computeSessionDurations(session, nowMs, user.assignedWorkHoursPerDay || session.assignedWorkHours);
  session.totalWorkSeconds = durations.totalWorkSeconds;
  session.totalBreakSeconds = durations.totalBreakSeconds;
  session.overtimeSeconds = durations.overtimeSeconds;
  session.updatedAt = nowIso;

  sessions[idx] = session;
  db.set('attendanceSessions', sessions);
  return session;
}

export function stopShiftTimer(
  user: User,
  notes?: string,
  now: Date = new Date()
): TechnicianAttendanceSession {
  const sessions = db.get('attendanceSessions') || [];
  const idx = sessions.findIndex(
    (s) => s.technicianId === user.id && (s.status === 'working' || s.status === 'on_break')
  );

  if (idx === -1) {
    throw new Error('No active shift timer is currently running.');
  }

  const session = { ...sessions[idx] };
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  // Auto-close any open break interval
  session.breaks = (session.breaks || []).map((br) => {
    if (!br.endTime) {
      const bStart = new Date(br.startTime).getTime();
      const dur = !isNaN(bStart) ? Math.max(0, Math.floor((nowMs - bStart) / 1000)) : 0;
      return {
        ...br,
        endTime: nowIso,
        durationSeconds: dur,
      };
    }
    return br;
  });

  session.status = 'stopped';
  session.stopTime = nowIso;
  if (notes?.trim()) {
    session.notes = notes.trim();
  }

  const assignedHours = user.assignedWorkHoursPerDay && user.assignedWorkHoursPerDay > 0
    ? user.assignedWorkHoursPerDay
    : (session.assignedWorkHours || 8);
  session.assignedWorkHours = assignedHours;

  const durations = computeSessionDurations(session, nowMs, assignedHours);
  session.totalWorkSeconds = durations.totalWorkSeconds;
  session.totalBreakSeconds = durations.totalBreakSeconds;
  session.overtimeSeconds = durations.overtimeSeconds;
  session.updatedAt = nowIso;

  sessions[idx] = session;
  db.set('attendanceSessions', sessions);
  return session;
}

export function getMyAttendanceStatus(user: User, dateKey: string = getLocalDateKey()) {
  const sessions = db.get('attendanceSessions') || [];
  const nowMs = Date.now();
  const assignedWorkHoursPerDay = user.assignedWorkHoursPerDay && user.assignedWorkHoursPerDay > 0
    ? user.assignedWorkHoursPerDay
    : 8;

  // Include active session even if started before midnight, plus all sessions on dateKey
  const activeSessionRaw = sessions.find(
    (s) => s.technicianId === user.id && (s.status === 'working' || s.status === 'on_break')
  ) || null;

  const todaySessionsRaw = sessions.filter(
    (s) => s.technicianId === user.id && s.date === dateKey
  );

  const enrich = (s: TechnicianAttendanceSession): TechnicianAttendanceSession => {
    const d = computeSessionDurations(s, nowMs, assignedWorkHoursPerDay);
    return {
      ...s,
      assignedWorkHours: assignedWorkHoursPerDay,
      totalWorkSeconds: d.totalWorkSeconds,
      totalBreakSeconds: d.totalBreakSeconds,
      overtimeSeconds: d.overtimeSeconds,
    };
  };

  const activeSession = activeSessionRaw ? enrich(activeSessionRaw) : null;
  const todaySessions = todaySessionsRaw.map(enrich);

  // Sum daily work & break across today's sessions (or active session if cross-midnight)
  const mergedMap = new Map<string, TechnicianAttendanceSession>();
  for (const s of todaySessions) mergedMap.set(s.id, s);
  if (activeSession) mergedMap.set(activeSession.id, activeSession);
  const relevantSessions = Array.from(mergedMap.values());

  const totalWorkSecondsToday = relevantSessions.reduce((acc, s) => acc + s.totalWorkSeconds, 0);
  const totalBreakSecondsToday = relevantSessions.reduce((acc, s) => acc + s.totalBreakSeconds, 0);
  const targetSeconds = Math.round(assignedWorkHoursPerDay * 3600);
  const overtimeSecondsToday = Math.max(0, totalWorkSecondsToday - targetSeconds);

  const currentStatus: 'working' | 'on_break' | 'stopped' | 'not_started' = activeSession
    ? activeSession.status
    : todaySessions.length > 0
      ? 'stopped'
      : 'not_started';

  return {
    technicianId: user.id,
    technicianName: user.name,
    role: user.role,
    date: dateKey,
    currentStatus,
    activeSession,
    todaySessions,
    assignedWorkHoursPerDay,
    assignedShiftLabel: user.assignedShiftLabel,
    totalWorkSecondsToday,
    totalBreakSecondsToday,
    overtimeSecondsToday,
    isOvertime: overtimeSecondsToday > 0,
    needsFirstLoginStart: user.role === 'technician' && todaySessions.length === 0 && !activeSession,
  };
}

export function getTechnicianAttendanceOverview(params?: {
  period?: 'daily' | 'monthly';
  date?: string;
  month?: string;
  technicianId?: string;
}): {
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
  };
  technicians: TechnicianAttendanceOverviewItem[];
} {
  const period = params?.period === 'monthly' ? 'monthly' : 'daily';
  const now = new Date();
  const dateKey = params?.date || getLocalDateKey(now);
  const monthKey = params?.month || dateKey.slice(0, 7) || getLocalMonthKey(now);
  const nowMs = now.getTime();

  const users = db.get('users') || [];
  const allSessions = db.get('attendanceSessions') || [];
  const tickets = db.get('tickets') || [];
  const tasks = db.get('tasks') || [];

  // Target technicians (include all users with role === 'technician', plus any staff user who has attendance records)
  const techUserIdsWithLogs = new Set(allSessions.map((s) => s.technicianId));
  let targetTechnicians = users.filter(
    (u) => u.role === 'technician' || techUserIdsWithLogs.has(u.id)
  );
  if (params?.technicianId) {
    targetTechnicians = targetTechnicians.filter((u) => u.id === params.technicianId);
  }

  const items: TechnicianAttendanceOverviewItem[] = targetTechnicians.map((tech) => {
    const assignedWorkHoursPerDay = tech.assignedWorkHoursPerDay && tech.assignedWorkHoursPerDay > 0
      ? tech.assignedWorkHoursPerDay
      : 8;
    const dailyTargetSeconds = Math.round(assignedWorkHoursPerDay * 3600);

    const userSessions = allSessions.filter((s) => s.technicianId === tech.id);

    const periodSessionsRaw = userSessions.filter((s) => {
      if (period === 'daily') {
        return s.date === dateKey || (dateKey === getLocalDateKey(now) && (s.status === 'working' || s.status === 'on_break'));
      }
      return s.date.startsWith(monthKey);
    });

    const periodSessions = periodSessionsRaw.map((s) => {
      const d = computeSessionDurations(s, nowMs, assignedWorkHoursPerDay);
      return {
        ...s,
        assignedWorkHours: assignedWorkHoursPerDay,
        totalWorkSeconds: d.totalWorkSeconds,
        totalBreakSeconds: d.totalBreakSeconds,
        overtimeSeconds: d.overtimeSeconds,
      };
    });

    // Live active session (any day)
    const activeSessionRaw = userSessions.find((s) => s.status === 'working' || s.status === 'on_break') || null;
    const activeSession = activeSessionRaw
      ? (() => {
          const d = computeSessionDurations(activeSessionRaw, nowMs, assignedWorkHoursPerDay);
          return {
            ...activeSessionRaw,
            assignedWorkHours: assignedWorkHoursPerDay,
            totalWorkSeconds: d.totalWorkSeconds,
            totalBreakSeconds: d.totalBreakSeconds,
            overtimeSeconds: d.overtimeSeconds,
          };
        })()
      : null;

    // Group work seconds per day so overtime is calculated accurately per working day
    const workByDay = new Map<string, number>();
    for (const s of periodSessions) {
      workByDay.set(s.date, (workByDay.get(s.date) || 0) + s.totalWorkSeconds);
    }

    const daysWorked = workByDay.size;
    let totalWorkSeconds = 0;
    let totalBreakSeconds = 0;
    let overtimeSeconds = 0;

    for (const s of periodSessions) {
      totalWorkSeconds += s.totalWorkSeconds;
      totalBreakSeconds += s.totalBreakSeconds;
    }

    for (const [, dayWorkSec] of workByDay.entries()) {
      if (dayWorkSec > dailyTargetSeconds) {
        overtimeSeconds += (dayWorkSec - dailyTargetSeconds);
      }
    }

    const expectedTargetSeconds = period === 'daily'
      ? dailyTargetSeconds
      : dailyTargetSeconds * Math.max(1, daysWorked);

    const sortedAsc = [...periodSessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const firstClockIn = sortedAsc[0]?.startTime;
    const latestSession = sortedAsc[sortedAsc.length - 1];
    const lastClockOut = activeSession
      ? undefined
      : latestSession?.stopTime;

    const currentStatus: 'working' | 'on_break' | 'stopped' | 'not_started' = activeSession
      ? activeSession.status
      : periodSessions.length > 0
        ? 'stopped'
        : 'not_started';

    // Task & Ticket status aggregation for this technician
    const techTickets = tickets.filter((t) => t.assignedTechnicianId === tech.id);
    const techTicketIds = new Set(techTickets.map((t) => t.id));
    const techTasks = tasks.filter(
      (tk) => techTicketIds.has(tk.ticketId) || tk.assignedTo === tech.id || tk.assignedTo === tech.name
    );
    const tasksCompleted = techTasks.filter((tk) => tk.completed).length;

    const openStatuses = new Set([
      'new',
      'open',
      'pending_requester',
      'pending_third_party',
      'waiting_approval',
      'on_hold',
    ]);
    const resolvedStatuses = new Set(['resolved', 'closed']);

    const openTickets = techTickets.filter((t) => openStatuses.has(t.status)).length;
    const inProgressTickets = techTickets.filter((t) => t.status === 'in_progress').length;
    const resolvedTickets = techTickets.filter((t) => resolvedStatuses.has(t.status)).length;
    const overdueTickets = techTickets.filter(
      (t) =>
        !resolvedStatuses.has(t.status) &&
        t.status !== 'cancelled' &&
        (t.slaStatus === 'breached' || (t.slaResolutionDeadline && new Date(t.slaResolutionDeadline).getTime() < nowMs))
    ).length;

    const recentTickets = [...techTickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((t) => {
        const tTasks = tasks.filter((tk) => tk.ticketId === t.id);
        return {
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          tasksCompleted: tTasks.filter((tk) => tk.completed).length,
          tasksTotal: tTasks.length,
        };
      });

    return {
      technicianId: tech.id,
      technicianName: tech.name,
      technicianEmail: tech.email,
      employeeCode: tech.employeeCode,
      role: tech.role,
      title: tech.title,
      assignedWorkHoursPerDay,
      assignedShiftLabel: tech.assignedShiftLabel,
      currentStatus,
      activeSession,
      sessions: periodSessions,
      daysWorked,
      firstClockIn,
      lastClockOut,
      totalWorkSeconds,
      totalBreakSeconds,
      expectedTargetSeconds,
      overtimeSeconds,
      isOvertime: overtimeSeconds > 0,
      taskStatus: {
        assignedTickets: techTickets.length,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        overdueTickets,
        tasksTotal: techTasks.length,
        tasksCompleted,
        tasksPending: techTasks.length - tasksCompleted,
        recentTickets,
      },
    };
  });

  const totals = {
    totalTechnicians: items.length,
    workingNow: items.filter((i) => i.currentStatus === 'working').length,
    onBreakNow: items.filter((i) => i.currentStatus === 'on_break').length,
    stoppedToday: items.filter((i) => i.currentStatus === 'stopped').length,
    notStarted: items.filter((i) => i.currentStatus === 'not_started').length,
    totalWorkSeconds: items.reduce((acc, i) => acc + i.totalWorkSeconds, 0),
    totalBreakSeconds: items.reduce((acc, i) => acc + i.totalBreakSeconds, 0),
    totalOvertimeSeconds: items.reduce((acc, i) => acc + i.overtimeSeconds, 0),
    techniciansWithOvertime: items.filter((i) => i.overtimeSeconds > 0).length,
    totalTasks: items.reduce((acc, i) => acc + i.taskStatus.tasksTotal, 0),
    tasksCompleted: items.reduce((acc, i) => acc + i.taskStatus.tasksCompleted, 0),
  };

  return {
    period,
    dateKey,
    monthKey,
    generatedAt: now.toISOString(),
    totals,
    technicians: items,
  };
}
