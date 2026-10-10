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
  if (ticket.status === 'resolved' || ticket.status === 'closed' || ticket.status === 'cancelled') {
    return { status: 'within_target' };
  }

  if (ticket.status === 'pending_requester' || ticket.status === 'on_hold') {
    return { status: 'paused', breachReason: 'SLA paused while awaiting user/third-party response.' };
  }

  const now = Date.now();
  const resolutionDeadline = new Date(ticket.slaResolutionDeadline).getTime();
  const firstResponseDeadline = new Date(ticket.slaFirstResponseDeadline).getTime();

  // Check first response breach
  if (!ticket.firstResponseAt && now > firstResponseDeadline) {
    return { status: 'breached', breachReason: 'First response target breached without agent contact.' };
  }

  // Check resolution deadline
  if (now > resolutionDeadline) {
    return { status: 'breached', breachReason: 'Resolution deadline breached without issue resolution.' };
  }

  // Warning if 75% elapsed
  const createdTime = new Date(ticket.createdAt).getTime();
  const totalDuration = resolutionDeadline - createdTime;
  const elapsed = now - createdTime;

  if (elapsed / totalDuration > 0.75) {
    return { status: 'warning', breachReason: 'Approaching SLA resolution threshold (>75% time elapsed).' };
  }

  return { status: 'within_target' };
}
