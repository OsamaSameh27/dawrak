import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService logout counter protection', () => {
  const prisma = {
    counterSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    ticket: { findFirst: jest.fn() },
    user: { updateMany: jest.fn() },
    counter: { update: jest.fn() },
    counterShift: { update: jest.fn() },
    $transaction: jest.fn(),
  };
  const gateway = { emitCountersUpdated: jest.fn() };
  const service = new AuthService(
    prisma as never,
    {} as JwtService,
    {} as ConfigService,
    gateway as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects logout before clearing the session when a counter has an active ticket', async () => {
    prisma.counterSession.findUnique.mockResolvedValue({
      id: 'session-id',
      counterId: 'counter-id',
      shiftId: 'shift-id',
      counter: { branchId: 'branch-id' },
    });
    prisma.ticket.findFirst.mockResolvedValue({ id: 'ticket-id' });

    await expect(service.logout('staff-id')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.counterSession.delete).not.toHaveBeenCalled();
    expect(gateway.emitCountersUpdated).not.toHaveBeenCalled();
  });

  it('releases and closes an idle counter before logging out', async () => {
    prisma.counterSession.findUnique.mockResolvedValue({
      id: 'session-id',
      counterId: 'counter-id',
      shiftId: 'shift-id',
      counter: { branchId: 'branch-id' },
    });
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.user.updateMany.mockReturnValue(Promise.resolve({ count: 1 }));
    prisma.counterSession.delete.mockReturnValue(Promise.resolve({ id: 'session-id' }));
    prisma.counter.update.mockReturnValue(Promise.resolve({ id: 'counter-id' }));
    prisma.counterShift.update.mockReturnValue(Promise.resolve({ id: 'shift-id' }));
    prisma.$transaction.mockResolvedValue([]);

    await service.logout('staff-id');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(gateway.emitCountersUpdated).toHaveBeenCalledWith('branch-id');
  });
});
