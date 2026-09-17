import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { CounterStatus, NotificationType, Prisma, Role, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { assertBranchAccess } from '../common/utils/branch-access';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from '../queues/queue.gateway';
import { CreateCounterDto } from './dto/create-counter.dto';
import { UpdateCounterDto } from './dto/update-counter.dto';

const COUNTER_SESSION_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class CountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: QueueGateway,
  ) {}

  async list(actor: AuthenticatedUser, branchId?: string) {
    await this.clearExpiredSessions();
    const effectiveBranchId = actor.role === Role.ADMIN ? branchId : actor.branchId ?? undefined;
    const counters = await this.prisma.counter.findMany({
      where: { branchId: effectiveBranchId },
      include: {
        service: { select: { id: true, name: true, nameAr: true, nameEn: true, prefix: true } },
        session: {
          select: {
            staffId: true, startedAt: true, lastSeenAt: true,
            staff: { select: { id: true, fullName: true } },
            shift: {
              select: {
                id: true, startedAt: true, openedAt: true,
                tickets: {
                  where: { status: { in: [TicketStatus.COMPLETED, TicketStatus.SKIPPED, TicketStatus.NO_SHOW] } },
                  select: { id: true },
                },
              },
            },
          },
        },
        tickets: {
          where: { status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
          select: {
            id: true, publicId: true, number: true, customerName: true,
            status: true, calledAt: true, serviceStartedAt: true,
          },
          take: 1,
        },
      },
      orderBy: { number: 'asc' },
    });
    return counters.map((counter) => ({
      ...counter,
      session: counter.session ? {
        staff: counter.session.staff,
        startedAt: counter.session.startedAt,
        lastSeenAt: counter.session.lastSeenAt,
        claimedByMe: counter.session.staffId === actor.id,
        shiftId: counter.session.shift.id,
        openedAt: counter.session.shift.openedAt,
        servedCount: counter.session.shift.tickets.length,
      } : null,
    }));
  }

  async create(actor: AuthenticatedUser, dto: CreateCounterDto) {
    assertBranchAccess(actor, dto.branchId);
    await this.assertServiceBranch(dto.serviceId, dto.branchId);
    try {
      return await this.prisma.counter.create({ data: { ...dto, name: `Desk ${dto.number}` } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Counter number already exists in this branch');
      }
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateCounterDto) {
    const counter = await this.findCounter(id);
    assertBranchAccess(actor, counter.branchId);
    await this.assertServiceBranch(dto.serviceId, counter.branchId);
    return this.prisma.counter.update({
      where: { id },
      data: { ...dto, name: dto.number === undefined ? undefined : `Desk ${dto.number}` },
    });
  }

  async updateStatus(actor: AuthenticatedUser, id: string, status: CounterStatus) {
    const counter = await this.findCounter(id);
    assertBranchAccess(actor, counter.branchId);
    await this.assertOwnedSession(actor, id);
    if (status === CounterStatus.OPEN && !counter.serviceId) {
      throw new BadRequestException('Assign a service before opening the counter');
    }
    if (status === CounterStatus.CLOSED) {
      const activeTicket = await this.prisma.ticket.findFirst({
        where: { counterId: id, status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
        select: { id: true },
      });
      if (activeTicket) throw new ConflictException('Complete or skip the active ticket before closing');
    }
    const now = new Date();
    const session = await this.prisma.counterSession.findUniqueOrThrow({ where: { counterId: id } });
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.counter.update({ where: { id }, data: { status } });
      if (status === CounterStatus.OPEN) {
        await tx.counterShift.updateMany({
          where: { id: session.shiftId, openedAt: null },
          data: { openedAt: now },
        });
      }
      return result;
    });
    this.gateway.emitCountersUpdated(counter.branchId);
    if (status === CounterStatus.OPEN || status === CounterStatus.CLOSED) {
      await this.gateway.notifyBranchManagers(counter.branchId, {
        type: NotificationType.TICKET_UPDATED,
        title: status === CounterStatus.OPEN
          ? 'notifications.types.counterOpened.title'
          : 'notifications.types.counterClosed.title',
        message: status === CounterStatus.OPEN
          ? 'notifications.types.counterOpened.message'
          : 'notifications.types.counterClosed.message',
        data: { counterNumber: counter.number },
      });
    }
    return updated;
  }

  async claim(actor: AuthenticatedUser, id: string) {
    await this.clearExpiredSessions();
    const counter = await this.findCounter(id);
    assertBranchAccess(actor, counter.branchId);
    if (!counter.serviceId) throw new BadRequestException('Assign a service before claiming the counter');

    const [counterSession, staffSession] = await Promise.all([
      this.prisma.counterSession.findUnique({ where: { counterId: id } }),
      this.prisma.counterSession.findUnique({ where: { staffId: actor.id } }),
    ]);
    if (counterSession && counterSession.staffId !== actor.id) {
      throw new ConflictException('Counter is already operated by another staff member');
    }
    if (staffSession && staffSession.counterId !== id) {
      throw new ConflictException('You are already operating another counter');
    }

    try {
      const session = counterSession
        ? await this.prisma.counterSession.update({
            where: { counterId: id }, data: { lastSeenAt: new Date() },
            include: { staff: { select: { id: true, fullName: true } }, shift: true },
          })
        : await this.prisma.$transaction(async (tx) => {
            const shift = await tx.counterShift.create({
              data: { counterId: id, staffId: actor.id },
            });
            return tx.counterSession.create({
              data: { counterId: id, staffId: actor.id, shiftId: shift.id },
              include: { staff: { select: { id: true, fullName: true } }, shift: true },
            });
          });
      this.gateway.emitCountersUpdated(counter.branchId);
      if (!counterSession) {
        await this.gateway.notifyBranchManagers(counter.branchId, {
          type: NotificationType.TICKET_UPDATED,
          title: 'notifications.types.shiftStarted.title',
          message: 'notifications.types.shiftStarted.message',
          data: { counterNumber: counter.number, staffName: session.staff.fullName },
        });
      }
      return this.sessionResponse(session, actor.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Counter is already in use');
      }
      throw error;
    }
  }

  async heartbeat(actor: AuthenticatedUser, id: string) {
    const session = await this.prisma.counterSession.findUnique({
      where: { counterId: id },
      include: {
        counter: { select: { branchId: true } },
        staff: { select: { id: true, fullName: true } },
        shift: true,
      },
    });
    if (!session || session.lastSeenAt < this.sessionCutoff()) {
      if (session) await this.expireSession(session);
      throw new ConflictException('Counter session expired');
    }
    assertBranchAccess(actor, session.counter.branchId);
    if (session.staffId !== actor.id) throw new ForbiddenException('Counter belongs to another staff member');
    const updated = await this.prisma.counterSession.update({
      where: { id: session.id }, data: { lastSeenAt: new Date() },
      include: { staff: { select: { id: true, fullName: true } }, shift: true },
    });
    return this.sessionResponse(updated, actor.id);
  }

  async release(actor: AuthenticatedUser, id: string): Promise<void> {
    const session = await this.prisma.counterSession.findUnique({
      where: { counterId: id },
      include: {
        counter: { select: { branchId: true, number: true } },
        staff: { select: { fullName: true } },
      },
    });
    if (!session) return;
    assertBranchAccess(actor, session.counter.branchId);
    if (session.staffId !== actor.id) throw new ForbiddenException('Counter belongs to another staff member');
    const activeTicket = await this.prisma.ticket.findFirst({
      where: { counterId: id, status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
      select: { id: true },
    });
    if (activeTicket) throw new ConflictException('Finish the active ticket before ending the counter session');
    await this.prisma.$transaction([
      this.prisma.counterShift.update({ where: { id: session.shiftId }, data: { endedAt: new Date() } }),
      this.prisma.counterSession.delete({ where: { id: session.id } }),
      this.prisma.counter.update({ where: { id }, data: { status: CounterStatus.CLOSED } }),
    ]);
    this.gateway.emitCountersUpdated(session.counter.branchId);
    await this.gateway.notifyBranchManagers(session.counter.branchId, {
      type: NotificationType.TICKET_UPDATED,
      title: 'notifications.types.shiftEnded.title',
      message: 'notifications.types.shiftEnded.message',
      data: { counterNumber: session.counter.number, staffName: session.staff.fullName },
    });
  }

  async shiftHistory(actor: AuthenticatedUser, counterId: string) {
    const counter = await this.findCounter(counterId);
    assertBranchAccess(actor, counter.branchId);
    return this.prisma.counterShift.findMany({
      where: { counterId },
      select: {
        id: true, startedAt: true, openedAt: true, endedAt: true,
        staff: { select: { id: true, fullName: true } },
        tickets: {
          select: {
            id: true, number: true, customerName: true, status: true,
            calledAt: true, serviceStartedAt: true, completedAt: true, serviceDurationSeconds: true,
            service: { select: { id: true, name: true, nameAr: true, nameEn: true } },
          },
          orderBy: { calledAt: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 30,
    });
  }

  private async findCounter(id: string) {
    const counter = await this.prisma.counter.findUnique({ where: { id } });
    if (!counter) throw new NotFoundException('Counter not found');
    return counter;
  }

  private async assertOwnedSession(actor: AuthenticatedUser, counterId: string): Promise<void> {
    const session = await this.prisma.counterSession.findUnique({
      where: { counterId },
      include: { counter: { select: { branchId: true } } },
    });
    if (!session || session.lastSeenAt < this.sessionCutoff()) {
      if (session) await this.expireSession(session);
      throw new ConflictException('Claim this counter before operating it');
    }
    if (session.staffId !== actor.id) throw new ForbiddenException('Counter belongs to another staff member');
  }

  private async clearExpiredSessions(): Promise<void> {
    const expired = await this.prisma.counterSession.findMany({
      where: { lastSeenAt: { lt: this.sessionCutoff() } },
      select: { id: true, counterId: true, shiftId: true },
    });
    if (!expired.length) return;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.counterShift.updateMany({
        where: { id: { in: expired.map((session) => session.shiftId) }, endedAt: null },
        data: { endedAt: now },
      }),
      this.prisma.counterSession.deleteMany({ where: { id: { in: expired.map((session) => session.id) } } }),
      this.prisma.counter.updateMany({
        where: { id: { in: expired.map((session) => session.counterId) } },
        data: { status: CounterStatus.CLOSED },
      }),
    ]);
  }

  private async expireSession(session: {
    id: string; counterId: string; shiftId: string; counter: { branchId: string };
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.counterShift.updateMany({
        where: { id: session.shiftId, endedAt: null }, data: { endedAt: new Date() },
      }),
      this.prisma.counterSession.delete({ where: { id: session.id } }),
      this.prisma.counter.update({
        where: { id: session.counterId }, data: { status: CounterStatus.CLOSED },
      }),
    ]);
    this.gateway.emitCountersUpdated(session.counter.branchId);
  }

  private sessionCutoff(): Date {
    return new Date(Date.now() - COUNTER_SESSION_TTL_MS);
  }

  private sessionResponse(
    session: {
      counterId: string; staffId: string; startedAt: Date; lastSeenAt: Date;
      staff: { id: string; fullName: string };
      shift: { id: string; openedAt: Date | null };
    },
    actorId: string,
  ) {
    return {
      counterId: session.counterId, staff: session.staff,
      startedAt: session.startedAt, lastSeenAt: session.lastSeenAt,
      claimedByMe: session.staffId === actorId,
      shiftId: session.shift.id, openedAt: session.shift.openedAt,
    };
  }

  private async assertServiceBranch(serviceId: string | null | undefined, branchId: string) {
    if (!serviceId) return;
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { branchId: true } });
    if (!service || service.branchId !== branchId) throw new BadRequestException('Service must belong to the same branch');
  }
}
