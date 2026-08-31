import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CounterStatus, NotificationType, Prisma, Role, TicketStatus,
} from '@prisma/client';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { assertBranchAccess } from '../common/utils/branch-access';
import { PrismaService } from '../prisma/prisma.service';
import { CallNextDto } from './dto/call-next.dto';
import { CreateGuestTicketDto } from './dto/create-guest-ticket.dto';
import { CreateMyTicketDto } from './dto/create-my-ticket.dto';
import { calculateEstimatedWait, canTransition } from './queue.domain';
import { QueueGateway } from './queue.gateway';

const ACTIVE_TICKET_STATUSES = [TicketStatus.WAITING, TicketStatus.CALLED, TicketStatus.SERVING];

@Injectable()
export class QueuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: QueueGateway,
    private readonly config: ConfigService,
  ) {}

  async createGuest(dto: CreateGuestTicketDto) {
    const manageToken = dto.idempotencyKey
      ? createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET')).update(dto.idempotencyKey).digest('hex')
      : randomBytes(32).toString('hex');
    const ticket = await this.createTicket({
      serviceId: dto.serviceId,
      customerName: dto.customerName.trim(),
      customerPhone: dto.customerPhone,
      note: dto.note,
      idempotencyKey: dto.idempotencyKey,
      manageTokenHash: this.hashToken(manageToken),
    });
    await this.broadcast(ticket.serviceId, ticket.publicId);
    return { ...(await this.getPublicTicket(ticket.publicId)), manageToken };
  }

  async createMine(user: AuthenticatedUser, dto: CreateMyTicketDto) {
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const ticket = await this.createTicket({
      serviceId: dto.serviceId,
      customerId: user.id,
      customerName: account.fullName,
      customerPhone: account.phone ?? undefined,
      note: dto.note,
      idempotencyKey: dto.idempotencyKey,
    });
    await this.broadcast(ticket.serviceId, ticket.publicId);
    return this.getPublicTicket(ticket.publicId);
  }

  async getPublicTicket(publicId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { publicId },
      select: {
        id: true, publicId: true, number: true, status: true, queueDate: true,
        createdAt: true, calledAt: true, serviceStartedAt: true, completedAt: true, cancelledAt: true,
        serviceId: true, priority: true, sequence: true,
        service: { select: { name: true, averageServiceMinutes: true } },
        branch: { select: { id: true, name: true, code: true, timezone: true } },
        counter: { select: { id: true, name: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const estimate = await this.estimate(ticket);
    const { priority: _priority, sequence: _sequence, ...safeTicket } = ticket;
    return { ...safeTicket, ...estimate };
  }

  async getMine(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { customerId: userId },
      select: { publicId: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return Promise.all(tickets.map((ticket) => this.getPublicTicket(ticket.publicId)));
  }

  async listOperational(actor: AuthenticatedUser, serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId }, include: { branch: { select: { timezone: true } } },
    });
    if (!service) throw new NotFoundException('Service not found');
    assertBranchAccess(actor, service.branchId);
    return this.prisma.ticket.findMany({
      where: {
        serviceId,
        queueDate: this.queueDate(service.branch.timezone),
        status: { in: ACTIVE_TICKET_STATUSES },
      },
      select: {
        id: true, publicId: true, number: true, customerName: true, customerPhone: true,
        status: true, priority: true, createdAt: true, calledAt: true, serviceStartedAt: true,
        counter: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { sequence: 'asc' }],
    });
  }

  async getSnapshot(serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, isActive: true, branch: { isActive: true } },
      include: { branch: { select: { id: true, name: true, code: true, timezone: true } } },
    });
    if (!service) throw new NotFoundException('Service not found');
    const queueDate = this.queueDate(service.branch.timezone);
    const [grouped, openCounters, nowServing, nextWaiting] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'], where: { serviceId, queueDate }, _count: { _all: true },
      }),
      this.prisma.counter.count({ where: { serviceId, status: CounterStatus.OPEN } }),
      this.prisma.ticket.findMany({
        where: { serviceId, queueDate, status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
        select: { number: true, status: true, counter: { select: { name: true } } },
        orderBy: { calledAt: 'asc' },
      }),
      this.prisma.ticket.findMany({
        where: { serviceId, queueDate, status: TicketStatus.WAITING },
        select: { number: true }, orderBy: [{ priority: 'desc' }, { sequence: 'asc' }], take: 5,
      }),
    ]);
    const counts = Object.fromEntries(Object.values(TicketStatus).map((status) => [status, 0])) as Record<TicketStatus, number>;
    grouped.forEach((item) => { counts[item.status] = item._count._all; });
    return {
      service: { id: service.id, name: service.name, prefix: service.prefix },
      branch: service.branch,
      queueDate,
      openCounters,
      averageServiceMinutes: service.averageServiceMinutes,
      counts,
      nowServing,
      nextWaiting: nextWaiting.map((ticket) => ticket.number),
      updatedAt: new Date().toISOString(),
    };
  }

  async callNext(actor: AuthenticatedUser, serviceId: string, dto: CallNextDto) {
    const counter = await this.prisma.counter.findUnique({ where: { id: dto.counterId } });
    if (!counter) throw new NotFoundException('Counter not found');
    assertBranchAccess(actor, counter.branchId);
    if (counter.serviceId !== serviceId || counter.status !== CounterStatus.OPEN) {
      throw new BadRequestException('Counter must be open and assigned to this service');
    }

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId }, include: { branch: { select: { timezone: true } } },
    });
    if (!service || service.branchId !== counter.branchId) throw new NotFoundException('Service not found');
    const queueDate = this.queueDate(service.branch.timezone);

    const ticket = await this.withSerializableRetry(async (tx) => {
      const active = await tx.ticket.findFirst({
        where: { counterId: counter.id, status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
        select: { id: true },
      });
      if (active) throw new ConflictException('This counter already has an active ticket');
      const next = await tx.ticket.findFirst({
        where: { serviceId, queueDate, status: TicketStatus.WAITING },
        orderBy: [{ priority: 'desc' }, { sequence: 'asc' }],
      });
      if (!next) throw new NotFoundException('No waiting tickets');
      return tx.ticket.update({
        where: { id: next.id },
        data: {
          status: TicketStatus.CALLED, counterId: counter.id, calledAt: new Date(),
          statusHistory: { create: { fromStatus: TicketStatus.WAITING, toStatus: TicketStatus.CALLED, changedById: actor.id } },
          notifications: {
            create: {
              userId: next.customerId, type: NotificationType.TICKET_CALLED,
              title: 'Your turn', message: `${next.number} is now called at ${counter.name}`,
            },
          },
        },
      });
    });
    await this.notifyNearTickets(serviceId, queueDate, service.nearTurnThreshold);
    await this.broadcast(serviceId, ticket.publicId, true);
    return this.getPublicTicket(ticket.publicId);
  }

  async recall(actor: AuthenticatedUser, id: string, note?: string) {
    const ticket = await this.getInternalTicket(id);
    assertBranchAccess(actor, ticket.branchId);
    if (ticket.status !== TicketStatus.CALLED) throw new BadRequestException('Only called tickets can be recalled');
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        calledAt: new Date(),
        statusHistory: { create: { fromStatus: TicketStatus.CALLED, toStatus: TicketStatus.CALLED, changedById: actor.id, note: note ?? 'Recalled' } },
      },
    });
    await this.broadcast(updated.serviceId, updated.publicId, true);
    return this.getPublicTicket(updated.publicId);
  }

  start(actor: AuthenticatedUser, id: string, note?: string) {
    return this.transition(actor, id, TicketStatus.SERVING, note);
  }

  complete(actor: AuthenticatedUser, id: string, note?: string) {
    return this.transition(actor, id, TicketStatus.COMPLETED, note);
  }

  skip(actor: AuthenticatedUser, id: string, note?: string) {
    return this.transition(actor, id, TicketStatus.SKIPPED, note);
  }

  noShow(actor: AuthenticatedUser, id: string, note?: string) {
    return this.transition(actor, id, TicketStatus.NO_SHOW, note);
  }

  async cancelGuest(publicId: string, manageToken: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { publicId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!ticket.manageTokenHash || !this.tokensMatch(ticket.manageTokenHash, this.hashToken(manageToken))) {
      throw new ForbiddenException('Invalid management token');
    }
    return this.cancelTicket(ticket.id, undefined);
  }

  async cancelMine(actor: AuthenticatedUser, id: string) {
    const ticket = await this.getInternalTicket(id);
    if (ticket.customerId !== actor.id) throw new ForbiddenException('This ticket does not belong to you');
    return this.cancelTicket(id, actor.id);
  }

  private async createTicket(input: {
    serviceId: string; customerId?: string; customerName: string; customerPhone?: string;
    manageTokenHash?: string; idempotencyKey?: string; note?: string;
  }) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.ticket.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) {
        this.assertIdempotentMatch(existing, input);
        return existing;
      }
    }
    const service = await this.prisma.service.findFirst({
      where: { id: input.serviceId, isActive: true, branch: { isActive: true } },
      include: { branch: { select: { timezone: true } } },
    });
    if (!service) throw new NotFoundException('Service is unavailable');
    const queueDate = this.queueDate(service.branch.timezone);
    if (input.customerId) {
      const duplicate = await this.prisma.ticket.findFirst({
        where: { customerId: input.customerId, serviceId: input.serviceId, queueDate, status: { in: ACTIVE_TICKET_STATUSES } },
        select: { number: true },
      });
      if (duplicate) throw new ConflictException(`You already have active ticket ${duplicate.number}`);
    }

    return this.withSerializableRetry(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.ticket.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) {
          this.assertIdempotentMatch(existing, input);
          return existing;
        }
      }
      const last = await tx.ticket.findFirst({
        where: { serviceId: service.id, queueDate }, orderBy: { sequence: 'desc' }, select: { sequence: true },
      });
      const sequence = (last?.sequence ?? 0) + 1;
      return tx.ticket.create({
        data: {
          branchId: service.branchId, serviceId: service.id, queueDate, sequence,
          number: `${service.prefix}-${sequence.toString().padStart(3, '0')}`,
          customerId: input.customerId, customerName: input.customerName,
          customerPhone: input.customerPhone, manageTokenHash: input.manageTokenHash,
          idempotencyKey: input.idempotencyKey, note: input.note,
          statusHistory: { create: { toStatus: TicketStatus.WAITING } },
          notifications: input.customerId ? {
            create: {
              userId: input.customerId, type: NotificationType.TICKET_CREATED,
              title: 'Ticket created', message: 'Your queue ticket has been created',
            },
          } : undefined,
        },
      });
    });
  }

  private async transition(actor: AuthenticatedUser, id: string, toStatus: TicketStatus, note?: string) {
    const ticket = await this.getInternalTicket(id);
    assertBranchAccess(actor, ticket.branchId);
    const updated = await this.withSerializableRetry(async (tx) => {
      const current = await tx.ticket.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Ticket not found');
      if (!canTransition(current.status, toStatus)) {
        throw new BadRequestException(`Cannot change ticket from ${current.status} to ${toStatus}`);
      }
      const timestampData: Prisma.TicketUpdateInput = {};
      if (toStatus === TicketStatus.SERVING) timestampData.serviceStartedAt = new Date();
      if (toStatus === TicketStatus.COMPLETED) timestampData.completedAt = new Date();
      return tx.ticket.update({
        where: { id },
        data: {
          ...timestampData, status: toStatus,
          statusHistory: { create: { fromStatus: current.status, toStatus, changedById: actor.id, note } },
          notifications: {
            create: {
              userId: current.customerId, type: NotificationType.TICKET_UPDATED,
              title: 'Ticket updated', message: `${current.number} is now ${toStatus}`,
            },
          },
        },
      });
    });
    await this.broadcast(updated.serviceId, updated.publicId);
    return this.getPublicTicket(updated.publicId);
  }

  private async cancelTicket(id: string, changedById: string | undefined) {
    const ticket = await this.getInternalTicket(id);
    const updated = await this.withSerializableRetry(async (tx) => {
      const current = await tx.ticket.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Ticket not found');
      if (!canTransition(current.status, TicketStatus.CANCELLED)) {
        throw new BadRequestException('Only waiting tickets can be cancelled');
      }
      return tx.ticket.update({
        where: { id },
        data: {
          status: TicketStatus.CANCELLED, cancelledAt: new Date(),
          statusHistory: { create: { fromStatus: current.status, toStatus: TicketStatus.CANCELLED, changedById } },
        },
      });
    });
    await this.broadcast(updated.serviceId, updated.publicId);
    return this.getPublicTicket(updated.publicId);
  }

  private async estimate(ticket: {
    id: string; serviceId: string; queueDate: Date; status: TicketStatus; priority: number; sequence: number;
    service: { averageServiceMinutes: number };
  }) {
    if (ticket.status !== TicketStatus.WAITING) return { peopleAhead: 0, estimatedWaitMinutes: 0 };
    const [peopleAhead, openCounters] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          serviceId: ticket.serviceId, queueDate: ticket.queueDate, status: TicketStatus.WAITING,
          OR: [
            { priority: { gt: ticket.priority } },
            { priority: ticket.priority, sequence: { lt: ticket.sequence } },
          ],
        },
      }),
      this.prisma.counter.count({ where: { serviceId: ticket.serviceId, status: CounterStatus.OPEN } }),
    ]);
    return {
      peopleAhead,
      estimatedWaitMinutes: calculateEstimatedWait(peopleAhead, ticket.service.averageServiceMinutes, openCounters),
    };
  }

  private async notifyNearTickets(serviceId: string, queueDate: Date, threshold: number) {
    if (threshold <= 0) return;
    const tickets = await this.prisma.ticket.findMany({
      where: { serviceId, queueDate, status: TicketStatus.WAITING, customerId: { not: null } },
      orderBy: [{ priority: 'desc' }, { sequence: 'asc' }], take: threshold,
    });
    for (const ticket of tickets) {
      const exists = await this.prisma.notification.findFirst({
        where: { ticketId: ticket.id, type: NotificationType.QUEUE_NEAR }, select: { id: true },
      });
      if (!exists) {
        await this.prisma.notification.create({
          data: {
            userId: ticket.customerId, ticketId: ticket.id, type: NotificationType.QUEUE_NEAR,
            title: 'Your turn is near', message: `${ticket.number} is approaching`,
          },
        });
      }
    }
  }

  private async getInternalTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  private async broadcast(serviceId: string, publicId: string, called = false) {
    const [snapshot, ticket] = await Promise.all([this.getSnapshot(serviceId), this.getPublicTicket(publicId)]);
    this.gateway.emitQueueUpdated(serviceId, snapshot);
    this.gateway.emitTicketUpdated(publicId, ticket);
    if (called) {
      this.gateway.emitTicketCalled(serviceId, {
        number: ticket.number,
        status: ticket.status,
        counter: ticket.counter,
      });
    }
  }

  private queueDate(timezone: string, now = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private tokensMatch(expected: string, actual: string): boolean {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(actual, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private assertIdempotentMatch(
    existing: {
      serviceId: string; customerId: string | null; customerName: string;
      customerPhone: string | null; note: string | null;
    },
    input: {
      serviceId: string; customerId?: string; customerName: string;
      customerPhone?: string; note?: string;
    },
  ): void {
    const matches = existing.serviceId === input.serviceId
      && existing.customerId === (input.customerId ?? null)
      && existing.customerName === input.customerName
      && existing.customerPhone === (input.customerPhone ?? null)
      && existing.note === (input.note ?? null);
    if (!matches) throw new ConflictException('Idempotency key was already used for a different request');
  }

  private async withSerializableRetry<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 10_000,
        });
      } catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError
          && (error.code === 'P2034' || error.code === 'P2002');
        if (!retryable || attempt === 4) throw error;
      }
    }
    throw new ConflictException('Could not reserve a queue number; please retry');
  }
}
