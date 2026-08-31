import { TicketStatus } from '@prisma/client';
import { calculateEstimatedWait, canTransition } from './queue.domain';

describe('queue domain rules', () => {
  it('allows the normal ticket lifecycle', () => {
    expect(canTransition(TicketStatus.WAITING, TicketStatus.CALLED)).toBe(true);
    expect(canTransition(TicketStatus.CALLED, TicketStatus.SERVING)).toBe(true);
    expect(canTransition(TicketStatus.SERVING, TicketStatus.COMPLETED)).toBe(true);
  });

  it('rejects invalid backwards transitions', () => {
    expect(canTransition(TicketStatus.COMPLETED, TicketStatus.WAITING)).toBe(false);
    expect(canTransition(TicketStatus.CANCELLED, TicketStatus.CALLED)).toBe(false);
  });

  it('calculates wait time across open counters', () => {
    expect(calculateEstimatedWait(6, 10, 2)).toBe(30);
    expect(calculateEstimatedWait(3, 7, 0)).toBe(21);
    expect(calculateEstimatedWait(0, 10, 2)).toBe(0);
  });
});
