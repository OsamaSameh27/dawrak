import { TicketStatus } from '@prisma/client';

const transitions: Record<TicketStatus, readonly TicketStatus[]> = {
  WAITING: [TicketStatus.CALLED, TicketStatus.CANCELLED],
  CALLED: [TicketStatus.SERVING, TicketStatus.SKIPPED, TicketStatus.NO_SHOW],
  SERVING: [TicketStatus.COMPLETED, TicketStatus.SKIPPED],
  COMPLETED: [],
  SKIPPED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return transitions[from].includes(to);
}

export function calculateEstimatedWait(
  peopleAhead: number,
  averageServiceMinutes: number,
  openCounters: number,
): number {
  if (peopleAhead <= 0) return 0;
  return Math.ceil((peopleAhead * averageServiceMinutes) / Math.max(1, openCounters));
}
