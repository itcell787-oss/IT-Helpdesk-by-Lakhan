import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Square,
  Coffee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Timer,
  X,
} from 'lucide-react';
import { User, TechnicianAttendanceSession } from '../types';
import { api } from '../services/api';

export function formatHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatHM(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${safe}s`;
}

export interface LiveAttendanceState {
  loading: boolean;
  actionLoading: boolean;
  currentStatus: 'working' | 'on_break' | 'stopped' | 'not_started';
  activeSession: TechnicianAttendanceSession | null;
  todaySessions: TechnicianAttendanceSession[];
  assignedWorkHoursPerDay: number;
  assignedShiftLabel?: string;
  liveWorkSeconds: number;
  liveBreakSeconds: number;
  liveOvertimeSeconds: number;
  isOvertime: boolean;
  needsFirstLoginStart: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startTimer: (notes?: string) => Promise<void>;
  stopTimer: (notes?: string) => Promise<void>;
  startBreak: (reason?: string) => Promise<void>;
  stopBreak: () => Promise<void>;
}

function computeLiveFromSessions(
  activeSession: TechnicianAttendanceSession | null,
  todaySessions: TechnicianAttendanceSession[],
  assignedHours: number,
  nowMs: number
) {
  const calcSession = (s: TechnicianAttendanceSession) => {
    const startMs = new Date(s.startTime).getTime();
    if (isNaN(startMs)) {
      return { work: s.totalWorkSeconds || 0, brk: s.totalBreakSeconds || 0 };
    }
    let closedBreak = 0;
    let openBreakStartMs: number | null = null;
    let activeBreak = 0;

    for (const b of s.breaks || []) {
      if (b.endTime) {
        const bs = new Date(b.startTime).getTime();
        const be = new Date(b.endTime).getTime();
        closedBreak += !isNaN(bs) && !isNaN(be) ? Math.max(0, Math.floor((be - bs) / 1000)) : (b.durationSeconds || 0);
      } else if (b.startTime) {
        const bs = new Date(b.startTime).getTime();
        if (!isNaN(bs)) {
          openBreakStartMs = bs;
          const endRef = s.status === 'stopped' && s.stopTime ? new Date(s.stopTime).getTime() : nowMs;
          activeBreak += Math.max(0, Math.floor((endRef - bs) / 1000));
        }
      }
    }

    let endMs = nowMs;
    if (s.status === 'stopped' && s.stopTime) {
      const ps = new Date(s.stopTime).getTime();
      if (!isNaN(ps)) endMs = ps;
    } else if (s.status === 'on_break' && openBreakStartMs !== null) {
      endMs = openBreakStartMs;
    }

    const gross = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const work = Math.max(0, gross - closedBreak);
    return { work, brk: closedBreak + activeBreak };
  };

  const merged = new Map<string, TechnicianAttendanceSession>();
  for (const s of todaySessions) merged.set(s.id, s);
  if (activeSession) merged.set(activeSession.id, activeSession);

  let totalWork = 0;
  let totalBreak = 0;
  for (const s of merged.values()) {
    const res = calcSession(s);
    totalWork += res.work;
    totalBreak += res.brk;
  }

  const targetSec = Math.round((assignedHours || 8) * 3600);
  const overtime = Math.max(0, totalWork - targetSec);
  return { totalWork, totalBreak, overtime };
}

export function useTechnicianAttendance(
  currentUser: User | null,
  onToast?: (msg: string) => void
): LiveAttendanceState {
  const isTechnician = Boolean(currentUser && currentUser.role === 'technician');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'working' | 'on_break' | 'stopped' | 'not_started'>('not_started');
  const [activeSession, setActiveSession] = useState<TechnicianAttendanceSession | null>(null);
  const [todaySessions, setTodaySessions] = useState<TechnicianAttendanceSession[]>([]);
  const [assignedWorkHoursPerDay, setAssignedWorkHoursPerDay] = useState<number>(8);
  const [assignedShiftLabel, setAssignedShiftLabel] = useState<string | undefined>(undefined);
  const [needsFirstLoginStart, setNeedsFirstLoginStart] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const applyServerStatus = useCallback((res: any) => {
    if (!res) return;
    setCurrentStatus(res.currentStatus || 'not_started');
    setActiveSession(res.activeSession || null);
    setTodaySessions(Array.isArray(res.todaySessions) ? res.todaySessions : []);
    setAssignedWorkHoursPerDay(res.assignedWorkHoursPerDay || 8);
    setAssignedShiftLabel(res.assignedShiftLabel);
    setNeedsFirstLoginStart(Boolean(res.needsFirstLoginStart));
    setNowMs(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    if (!isTechnician) return;
    try {
      const res = await api.getMyAttendanceStatus();
      applyServerStatus(res);
    } catch {
      // Silent poll error
    }
  }, [isTechnician, applyServerStatus]);

  useEffect(() => {
    if (!isTechnician) {
      setCurrentStatus('not_started');
      setActiveSession(null);
      setTodaySessions([]);
      setNeedsFirstLoginStart(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));

    const poll = setInterval(refresh, 15000);
    return () => clearInterval(poll);
  }, [isTechnician, refresh]);

  // 1-second local ticker whenever working or on break
  useEffect(() => {
    if (!isTechnician) return;
    if (currentStatus !== 'working' && currentStatus !== 'on_break') return;
    const ticker = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, [isTechnician, currentStatus]);

  const startTimer = async (notes?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.startShiftTimer(notes);
      applyServerStatus(res.status);
      onToast?.('Shift working timer started!');
    } catch (err: any) {
      setError(err.message || 'Failed to start timer');
    } finally {
      setActionLoading(false);
    }
  };

  const stopTimer = async (notes?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.stopShiftTimer(notes);
      applyServerStatus(res.status);
      onToast?.('Shift timer stopped and attendance recorded.');
    } catch (err: any) {
      setError(err.message || 'Failed to stop timer');
    } finally {
      setActionLoading(false);
    }
  };

  const startBreak = async (reason?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.startBreakTimer(reason);
      applyServerStatus(res.status);
      onToast?.('Break timer started. Work clock paused.');
    } catch (err: any) {
      setError(err.message || 'Failed to start break timer');
    } finally {
      setActionLoading(false);
    }
  };

  const stopBreak = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.stopBreakTimer();
      applyServerStatus(res.status);
      onToast?.('Break ended. Work timer resumed!');
    } catch (err: any) {
      setError(err.message || 'Failed to stop break timer');
    } finally {
      setActionLoading(false);
    }
  };

  const computed = computeLiveFromSessions(activeSession, todaySessions, assignedWorkHoursPerDay, nowMs);

  return {
    loading,
    actionLoading,
    currentStatus,
    activeSession,
    todaySessions,
    assignedWorkHoursPerDay,
    assignedShiftLabel,
    liveWorkSeconds: computed.totalWork,
    liveBreakSeconds: computed.totalBreak,
    liveOvertimeSeconds: computed.overtime,
    isOvertime: computed.overtime > 0,
    needsFirstLoginStart,
    error,
    refresh,
    startTimer,
    stopTimer,
    startBreak,
    stopBreak,
  };
}

/* ========================================================================= */
/* 1. Compact Navbar Live Timer Widget (Always visible for Technicians)       */
/* ========================================================================= */
export const TechnicianNavbarTimerWidget: React.FC<{
  attendance: LiveAttendanceState;
}> = ({ attendance }) => {
  const {
    currentStatus,
    liveWorkSeconds,
    liveBreakSeconds,
    liveOvertimeSeconds,
    isOvertime,
    assignedWorkHoursPerDay,
    actionLoading,
    startTimer,
    stopTimer,
    startBreak,
    stopBreak,
  } = attendance;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xs">
      {/* Live Status Indicator */}
      <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-200 dark:border-slate-800">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            currentStatus === 'working'
              ? 'bg-emerald-500 animate-pulse'
              : currentStatus === 'on_break'
                ? 'bg-amber-500 animate-pulse'
                : currentStatus === 'stopped'
                  ? 'bg-slate-400'
                  : 'bg-rose-500 animate-ping'
          }`}
        />
        <div className="flex flex-col leading-none">
          <span className="font-mono text-[11px] font-extrabold tabular-nums text-slate-900 dark:text-white">
            {currentStatus === 'on_break' ? formatHMS(liveBreakSeconds) : formatHMS(liveWorkSeconds)}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {currentStatus === 'working'
              ? isOvertime
                ? `OT +${formatHM(liveOvertimeSeconds)}`
                : `Work / ${assignedWorkHoursPerDay}h`
              : currentStatus === 'on_break'
                ? 'On Break'
                : currentStatus === 'stopped'
                  ? 'Shift Done'
                  : 'Start Shift'}
          </span>
        </div>
      </div>

      {/* Timer Action Controls */}
      {currentStatus === 'not_started' || currentStatus === 'stopped' ? (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => startTimer()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          title="Start Working Shift Timer"
        >
          <Play className="w-3 h-3 fill-current" />
          <span className="hidden xl:inline">{currentStatus === 'stopped' ? 'Resume' : 'Start Timer'}</span>
        </button>
      ) : currentStatus === 'working' ? (
        <>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => startBreak('Break')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
            title="Start Break Timer (Pauses work clock)"
          >
            <Coffee className="w-3 h-3" />
            <span className="hidden xl:inline">Break</span>
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => stopTimer()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
            title="Stop Shift Timer & Clock Out"
          >
            <Square className="w-3 h-3 fill-current" />
            <span className="hidden xl:inline">Stop</span>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => stopBreak()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer disabled:opacity-50"
            title="Stop Break Timer & Resume Work"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden xl:inline">End Break</span>
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => stopTimer()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
            title="Stop Shift Timer & Clock Out"
          >
            <Square className="w-3 h-3 fill-current" />
            <span className="hidden xl:inline">Stop</span>
          </button>
        </>
      )}
    </div>
  );
};

/* ========================================================================= */
/* 2. First-Login Shift Prompt Modal (Shown on Technician's First Login)     */
/* ========================================================================= */
export const TechnicianFirstLoginTimerModal: React.FC<{
  isOpen: boolean;
  user: User;
  attendance: LiveAttendanceState;
  onDismiss: () => void;
}> = ({ isOpen, user, attendance, onDismiss }) => {
  const [notes, setNotes] = useState('');

  if (!isOpen || !attendance.needsFirstLoginStart) return null;

  const handleStart = async () => {
    await attendance.startTimer(notes);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md neu-modal rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-5">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 p-1.5 rounded-xl neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          title="Remind me later"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Start Your Shift Working Timer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Welcome back, <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong> ({user.employeeCode || 'Technician'})
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl neu-pressed space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Attendance Date</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {new Date().toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Work Hours</span>
            <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
              {attendance.assignedWorkHoursPerDay} hrs / day
            </span>
          </div>
          {attendance.assignedShiftLabel && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Shift Schedule</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {attendance.assignedShiftLabel}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Shift Handover / Check-in Note (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning L1/L2 queue shift started"
            className="w-full px-3 py-2 text-xs neu-input rounded-xl focus:outline-none"
          />
        </div>

        {attendance.error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {attendance.error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 text-xs font-semibold neu-btn rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            Later
          </button>
          <button
            type="button"
            disabled={attendance.actionLoading}
            onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{attendance.actionLoading ? 'Starting...' : 'Start Shift Timer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 3. Dashboard Shift Attendance & Break Control Panel (For Technicians)      */
/* ========================================================================= */
export const TechnicianShiftCard: React.FC<{
  attendance: LiveAttendanceState;
  user: User;
}> = ({ attendance, user }) => {
  const [breakReason, setBreakReason] = useState('Lunch / Tea Break');
  const [showBreakInput, setShowBreakInput] = useState(false);

  const {
    currentStatus,
    activeSession,
    todaySessions,
    assignedWorkHoursPerDay,
    liveWorkSeconds,
    liveBreakSeconds,
    liveOvertimeSeconds,
    isOvertime,
    actionLoading,
    startTimer,
    stopTimer,
    startBreak,
    stopBreak,
  } = attendance;

  const targetSeconds = Math.max(1, Math.round(assignedWorkHoursPerDay * 3600));
  const progressPercent = Math.min(100, Math.round((liveWorkSeconds / targetSeconds) * 100));

  const allBreaksToday = todaySessions.flatMap((s) => s.breaks || []);

  return (
    <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              currentStatus === 'working'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : currentStatus === 'on_break'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Technician Shift Attendance &amp; Break Tracker
              </h2>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono border ${
                  currentStatus === 'working'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50'
                    : currentStatus === 'on_break'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50'
                      : currentStatus === 'stopped'
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/50'
                }`}
              >
                {currentStatus === 'working'
                  ? '● Working'
                  : currentStatus === 'on_break'
                    ? '☕ On Break'
                    : currentStatus === 'stopped'
                      ? '✓ Shift Completed'
                      : '○ Not Started'}
              </span>
              {isOvertime && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-mono bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Overtime +{formatHMS(liveOvertimeSeconds)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user.name} · Assigned Daily Target:{' '}
              <strong className="font-mono text-cyan-700 dark:text-cyan-400">
                {assignedWorkHoursPerDay} hrs/day
              </strong>
              {activeSession?.startTime && (
                <>
                  {' · '}Clocked In:{' '}
                  <strong className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Live Counters + Control Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl neu-pressed">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                Work Time
              </div>
              <div className="font-mono text-base font-extrabold tabular-nums text-cyan-700 dark:text-cyan-400">
                {formatHMS(liveWorkSeconds)}
              </div>
            </div>
            <div className="w-px h-7 bg-slate-300 dark:bg-white/10" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                Break Time
              </div>
              <div className="font-mono text-base font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                {formatHMS(liveBreakSeconds)}
              </div>
            </div>
            {isOvertime && (
              <>
                <div className="w-px h-7 bg-slate-300 dark:bg-white/10" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-rose-500">
                    Overtime
                  </div>
                  <div className="font-mono text-base font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                    +{formatHMS(liveOvertimeSeconds)}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(currentStatus === 'not_started' || currentStatus === 'stopped') && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => startTimer()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{currentStatus === 'stopped' ? 'Start New Session' : 'Start Timer'}</span>
              </button>
            )}

            {currentStatus === 'working' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowBreakInput(!showBreakInput)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 cursor-pointer disabled:opacity-50"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Start Break</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => stopTimer()}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Timer</span>
                </button>
              </>
            )}

            {currentStatus === 'on_break' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => stopBreak()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Break &amp; Resume</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => stopTimer()}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Shift</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Optional Break Reason Bar */}
      {showBreakInput && currentStatus === 'working' && (
        <div className="p-3 rounded-xl neu-card border border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 animate-in fade-in">
          <input
            type="text"
            value={breakReason}
            onChange={(e) => setBreakReason(e.target.value)}
            placeholder="Break reason (e.g. Lunch Break, Tea Break)"
            className="flex-1 px-3 py-1.5 text-xs neu-input rounded-lg focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBreakInput(false)}
              className="neu-btn px-3 py-1.5 text-xs rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={async () => {
                await startBreak(breakReason);
                setShowBreakInput(false);
              }}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
            >
              Confirm Break Start
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar Toward Assigned Hours */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-600 dark:text-slate-400">
            Daily Target Progress ({formatHM(liveWorkSeconds)} / {assignedWorkHoursPerDay}h assigned)
          </span>
          <span className={`font-mono font-bold ${isOvertime ? 'text-rose-600 dark:text-rose-400' : 'text-cyan-700 dark:text-cyan-400'}`}>
            {isOvertime ? `100% + ${formatHM(liveOvertimeSeconds)} Overtime` : `${progressPercent}%`}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOvertime
                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Break & Session History Summary Today */}
      {(todaySessions.length > 0 || allBreaksToday.length > 0) && (
        <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Sessions today: <strong className="font-mono text-slate-900 dark:text-slate-200">{todaySessions.length}</strong>
          </span>
          <span>•</span>
          <span className="font-semibold flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5 text-amber-500" />
            Breaks taken: <strong className="font-mono text-slate-900 dark:text-slate-200">{allBreaksToday.length}</strong> ({formatHM(liveBreakSeconds)})
          </span>
          {allBreaksToday.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {allBreaksToday.slice(-3).map((b) => (
                <span
                  key={b.id}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 font-mono text-[10px]"
                >
                  {b.reason || 'Break'}: {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {b.endTime ? `–${new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Active)'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {attendance.error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{attendance.error}</span>
        </div>
      )}
    </div>
  );
};
