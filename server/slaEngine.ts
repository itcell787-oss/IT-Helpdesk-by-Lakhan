import { Ticket, TicketPriority, SlaPolicy, SlaStatus } from '../src/types';

export function calculateSlaDeadlines(priority: TicketPriority, policies: SlaPolicy[], createdAt: Date = new Date()) {
  const policy = policies.find(p => p.priority === priority) || policies.find(p => p.isDefault) || {
    firstResponseMinutes: 240,
    resolutionMinutes: 1440,
  };

  const firstResponseDeadline = new Date(createdAt.getTime() + policy.firstResponseMinutes * 60 * 1000);
  const resolutionDeadline = new Date(createdAt.getTime() + policy.resolutionMinutes * 60 * 1000);

  return {
    firstResponseDeadline: firstResponseDeadline.toISOString(),
    resolutionDeadline: resolutionDeadline.toISOString(),
  };
}

export function evaluateSlaStatus(ticket: Ticket): { status: SlaStatus; breachReason?: string } {
  // 1. Superadmin manual SLA override or status lock
  if (ticket.slaStatusOverride) {
    return {
      status: ticket.slaStatusOverride,
      breachReason: ticket.slaOverrideReason || ticket.slaBreachReason || 'SLA status overridden by Superadmin',
    };
  }

  // 2. Cancelled tickets
  if (ticket.status === 'cancelled') {
    return { status: 'within_target' };
  }

  const resolutionDeadline = ticket.slaResolutionDeadline ? new Date(ticket.slaResolutionDeadline).getTime() : 0;
  const firstResponseDeadline = ticket.slaFirstResponseDeadline ? new Date(ticket.slaFirstResponseDeadline).getTime() : 0;

  // 3. Resolved or Closed Tickets: Check if resolution occurred AFTER SLA timer expired
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    const resolutionTimestamp = ticket.resolvedAt
      ? new Date(ticket.resolvedAt).getTime()
      : (ticket.closedAt ? new Date(ticket.closedAt).getTime() : Date.now());

    // Strict Rule: If resolved after SLA resolution deadline, it must be SLA BREACHED
    if (resolutionDeadline && resolutionTimestamp > resolutionDeadline) {
      const minutesOverdue = Math.round((resolutionTimestamp - resolutionDeadline) / (60 * 1000));
      return {
        status: 'breached',
        breachReason: `SLA Breached: Ticket was resolved after the resolution timer had expired (${minutesOverdue > 0 ? `${minutesOverdue} min overdue` : 'Deadline exceeded'}).`,
      };
    }

    // Check if initial response deadline was breached prior to closure
    if (ticket.firstResponseAt && firstResponseDeadline && new Date(ticket.firstResponseAt).getTime() > firstResponseDeadline) {
      const respOverdue = Math.round((new Date(ticket.firstResponseAt).getTime() - firstResponseDeadline) / (60 * 1000));
      return {
        status: 'breached',
        breachReason: `SLA Breached: Initial response target was breached (${respOverdue} min delay).`,
      };
    }

    return { status: 'within_target' };
  }

  // 4. Paused tickets (awaiting customer/third-party)
  if (ticket.status === 'pending_requester' || ticket.status === 'on_hold') {
    return { status: 'paused', breachReason: 'SLA paused while awaiting user/third-party response.' };
  }

  const now = Date.now();

  // 5. Active tickets: Check resolution deadline breach
  if (resolutionDeadline && now > resolutionDeadline) {
    const minutesOverdue = Math.round((now - resolutionDeadline) / (60 * 1000));
    return {
      status: 'breached',
      breachReason: `SLA Breached: Resolution target expired without resolution (${minutesOverdue} min overdue).`,
    };
  }

  // 6. Active tickets: Check first response deadline breach
  if (firstResponseDeadline && !ticket.firstResponseAt && now > firstResponseDeadline) {
    const respOverdue = Math.round((now - firstResponseDeadline) / (60 * 1000));
    return {
      status: 'breached',
      breachReason: `SLA Breached: First response target expired (${respOverdue} min overdue).`,
    };
  }

  // 7. Warning threshold if > 75% elapsed
  const createdTime = new Date(ticket.createdAt).getTime();
  const totalDuration = resolutionDeadline - createdTime;
  const elapsed = now - createdTime;

  if (totalDuration > 0 && elapsed / totalDuration > 0.75) {
    return { status: 'warning', breachReason: 'Approaching SLA resolution threshold (>75% time elapsed).' };
  }

  return { status: 'within_target' };
}
