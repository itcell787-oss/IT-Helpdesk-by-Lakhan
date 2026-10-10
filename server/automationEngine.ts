import { AutomationRule, Ticket, TicketComment } from '../src/types';

export function runAutomations(
  trigger: 'ticket_created' | 'ticket_updated' | 'status_changed' | 'priority_changed',
  ticket: Ticket,
  rules: AutomationRule[]
): {
  updatedTicket: Ticket;
  generatedComments: TicketComment[];
  appliedRules: string[];
} {
  let modifiedTicket = { ...ticket };
  const generatedComments: TicketComment[] = [];
  const appliedRules: string[] = [];

  const activeRules = rules
    .filter(r => r.enabled && r.trigger === trigger)
    .sort((a, b) => a.order - b.order);

  for (const rule of activeRules) {
    let conditionsMet = true;

    for (const cond of rule.conditions) {
      const ticketVal = (modifiedTicket as any)[cond.field] ?? '';
      const strVal = String(ticketVal).toLowerCase();
      const targetVal = String(cond.value).toLowerCase();

      switch (cond.operator) {
        case 'equals':
          if (strVal !== targetVal) conditionsMet = false;
          break;
        case 'not_equals':
          if (strVal === targetVal) conditionsMet = false;
          break;
        case 'contains':
          if (!strVal.includes(targetVal)) conditionsMet = false;
          break;
        case 'is_empty':
          if (strVal.trim() !== '') conditionsMet = false;
          break;
      }

      if (!conditionsMet) break;
    }

    if (conditionsMet) {
      appliedRules.push(rule.id);
      rule.executionCount = (rule.executionCount || 0) + 1;
      rule.lastExecutedAt = new Date().toISOString();

      for (const action of rule.actions) {
        switch (action.type) {
          case 'assign_team':
            modifiedTicket.assignedTeamId = action.value;
            break;
          case 'assign_technician':
            modifiedTicket.assignedTechnicianId = action.value;
            break;
          case 'set_priority':
            modifiedTicket.priority = action.value as any;
            break;
          case 'set_status':
            modifiedTicket.status = action.value as any;
            break;
          case 'add_tag':
            if (!modifiedTicket.tags.includes(action.value)) {
              modifiedTicket.tags = [...modifiedTicket.tags, action.value];
            }
            break;
          case 'add_internal_note':
            generatedComments.push({
              id: `cmt-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              ticketId: modifiedTicket.id,
              authorId: 'sys-automation',
              authorName: 'Automation Engine',
              authorEmail: 'system@ithelpdesk.internal',
              authorRole: 'superadmin',
              isInternal: true,
              content: action.value,
              createdAt: new Date().toISOString(),
            });
            break;
        }
      }
    }
  }

  return {
    updatedTicket: modifiedTicket,
    generatedComments,
    appliedRules,
  };
}
