import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { assertBranchAccess } from '../common/utils/branch-access';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

interface ServiceBucket {
  id: string;
  name: string;
  total: number;
  completed: number;
  waitSamples: number[];
  serviceSamples: number[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(actor: AuthenticatedUser, query: ReportQueryDto) {
    assertBranchAccess(actor, query.branchId);
    const branch = await this.prisma.branch.findUnique({ where: { id: query.branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    const from = new Date(`${query.from}T00:00:00.000Z`);
    const to = new Date(`${query.to}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Invalid report date range');
    }
    if (to.getTime() - from.getTime() > 92 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Report range cannot exceed 92 days');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        branchId: query.branchId,
        queueDate: { gte: new Date(`${query.from}T00:00:00.000Z`), lte: new Date(`${query.to}T00:00:00.000Z`) },
      },
      select: {
        status: true, createdAt: true, calledAt: true, serviceStartedAt: true, completedAt: true,
        service: { select: { id: true, name: true } },
      },
    });
    const byStatus = Object.fromEntries(Object.values(TicketStatus).map((status) => [status, 0])) as Record<TicketStatus, number>;
    const hourlyLoad = Array.from({ length: 24 }, (_, hour) => ({ hour, tickets: 0 }));
    const services = new Map<string, ServiceBucket>();
    const waitSamples: number[] = [];
    const serviceSamples: number[] = [];

    for (const ticket of tickets) {
      byStatus[ticket.status] += 1;
      const hour = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: branch.timezone, hour: '2-digit', hour12: false,
      }).format(ticket.createdAt)) % 24;
      hourlyLoad[hour].tickets += 1;
      const bucket = services.get(ticket.service.id) ?? {
        id: ticket.service.id, name: ticket.service.name, total: 0, completed: 0,
        waitSamples: [], serviceSamples: [],
      };
      bucket.total += 1;
      if (ticket.status === TicketStatus.COMPLETED) bucket.completed += 1;
      if (ticket.calledAt) {
        const minutes = this.minutesBetween(ticket.createdAt, ticket.calledAt);
        waitSamples.push(minutes); bucket.waitSamples.push(minutes);
      }
      if (ticket.serviceStartedAt && ticket.completedAt) {
        const minutes = this.minutesBetween(ticket.serviceStartedAt, ticket.completedAt);
        serviceSamples.push(minutes); bucket.serviceSamples.push(minutes);
      }
      services.set(bucket.id, bucket);
    }

    return {
      range: { from: query.from, to: query.to },
      branch: { id: branch.id, name: branch.name, code: branch.code },
      metrics: {
        totalTickets: tickets.length,
        completedTickets: byStatus.COMPLETED,
        cancelledTickets: byStatus.CANCELLED,
        noShowTickets: byStatus.NO_SHOW,
        averageWaitMinutes: this.average(waitSamples),
        averageServiceMinutes: this.average(serviceSamples),
      },
      byStatus,
      byService: [...services.values()].map((service) => ({
        id: service.id, name: service.name, totalTickets: service.total,
        completedTickets: service.completed,
        averageWaitMinutes: this.average(service.waitSamples),
        averageServiceMinutes: this.average(service.serviceSamples),
      })).sort((a, b) => b.totalTickets - a.totalTickets),
      hourlyLoad,
    };
  }

  private minutesBetween(start: Date, end: Date): number {
    return Math.max(0, (end.getTime() - start.getTime()) / 60_000);
  }

  private average(values: number[]): number {
    if (!values.length) return 0;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }
}
