import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { SlaStatus, TicketPriority } from '../types';

interface SlaCountdownBadgeProps {
  targetDeadline?: string;
  slaStatus?: SlaStatus;
  isResolved?: boolean;
  size?: 'sm' | 'md' | 'lg';
  createdAt?: string;
  priority?: TicketPriority | string;
  showLivePulse?: boolean;
}

export const SlaCountdownBadge: React.FC<SlaCountdownBadgeProps> = ({
  targetDeadline,
  slaStatus,
  isResolved = false,
  size = 'sm',
  createdAt,
  priority = 'normal',
  showLivePulse = true,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isBreached, setIsBreached] = useState<boolean>(slaStatus === 'breached');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Derive target deadline if missing but createdAt is present
  const effectiveDeadline = React.useMemo(() => {
    if (targetDeadline) return targetDeadline;
    if (!createdAt) return undefined;

    // Standard SLA default hours by priority
    const slaHoursByPriority: Record<string, number> = {
      critical: 4,
      urgent: 8,
      high: 16,
      normal: 24,
      low: 48,
    };
    const hours = slaHoursByPriority[priority?.toLowerCase()] || 24;
    const createdTime = new Date(createdAt).getTime();
    return new Date(createdTime + hours * 3600 * 1000).toISOString();
  }, [targetDeadline, createdAt, priority]);

  useEffect(() => {
    if (isResolved || !effectiveDeadline) return;

    const updateTimer = () => {
      const now = Date.now();
      const target = new Date(effectiveDeadline).getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setIsBreached(true);
        const overMs = Math.abs(diffMs);
        const hours = Math.floor(overMs / (1000 * 60 * 60));
        const mins = Math.floor((overMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((overMs % (1000 * 60)) / 1000);
        setSecondsRemaining(Math.floor(diffMs / 1000));
        setTimeRemaining(`-${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
      } else {
        setIsBreached(false);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setSecondsRemaining(Math.floor(diffMs / 1000));
        setTimeRemaining(`${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
      }
    };

    updateTimer();
    // 1-second live ticking interval for active open ticket timer
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [effectiveDeadline, isResolved]);

  if (isResolved) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-bold rounded-lg text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/60 ${
          size === 'lg' ? 'px-3 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'
        }`}
      >
        <CheckCircle2 className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} />
        <span>SLA Fulfilled</span>
      </span>
    );
  }

  if (slaStatus === 'paused') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 select-none ${
          size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
        }`}
        title="SLA timer paused while awaiting user response or third-party vendor"
      >
        <Clock className={size === 'lg' ? 'w-3.5 h-3.5 text-slate-500' : 'w-2.5 h-2.5 text-slate-500'} />
        <span>SLA Paused</span>
      </span>
    );
  }

  if (!effectiveDeadline) {
    return (
      <span className="text-[10px] text-slate-400 font-mono italic">No SLA Target</span>
    );
  }

  // Warning when less than 2 hours (7200 seconds) remain or backend status is warning
  const isWarning = !isBreached && (slaStatus === 'warning' || (secondsRemaining > 0 && secondsRemaining < 7200));

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-lg transition-colors select-none ${
        size === 'lg' ? 'px-3 py-1.5 text-xs' : size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'
      } ${
        isBreached
          ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 animate-pulse'
          : isWarning
          ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800'
          : 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
      }`}
      title={isBreached ? 'SLA resolution deadline breached' : `SLA Live Target: ${new Date(effectiveDeadline).toLocaleString()}`}
    >
      {/* Live pulsing dot indicator for open tickets */}
      {showLivePulse && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isBreached ? 'bg-rose-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isBreached ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </span>
      )}

      {isBreached ? (
        <AlertTriangle className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} />
      ) : (
        <Clock className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} />
      )}

      <span>
        {timeRemaining ? (
          <>
            <span className="font-extrabold">{timeRemaining}</span>
            <span className="text-[9px] opacity-75 ml-1">{isBreached ? 'overdue' : 'left'}</span>
          </>
        ) : (
          'Calculating...'
        )}
      </span>
    </span>
  );
};
