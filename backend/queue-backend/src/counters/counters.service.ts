import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CounterStatus, Prisma, Role, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { assertBranchAccess } from '../common/utils/branch-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCounterDto } from './dto/create-counter.dto';
import { UpdateCounterDto } from './dto/update-counter.dto';

@Injectable()
export class CountersService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: AuthenticatedUser, branchId?: string) {
    const effectiveBranchId = actor.role === Role.ADMIN ? branchId : actor.branchId ?? undefined;
    return this.prisma.counter.findMany({
      where: { branchId: effectiveBranchId },
      include: {
        service: { select: { id: true, name: true, prefix: true } },
        tickets: {
          where: { status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
          select: { id: true, publicId: true, number: true, status: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(actor: AuthenticatedUser, dto: CreateCounterDto) {
    assertBranchAccess(actor, dto.branchId);
    await this.assertServiceBranch(dto.serviceId, dto.branchId);
    try {
      return await this.prisma.counter.create({ data: { ...dto, name: dto.name.trim() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Counter name already exists in this branch');
      }
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateCounterDto) {
    const counter = await this.findCounter(id);
    assertBranchAccess(actor, counter.branchId);
    await this.assertServiceBranch(dto.serviceId, counter.branchId);
    return this.prisma.counter.update({ where: { id }, data: { ...dto, name: dto.name?.trim() } });
  }

  async updateStatus(actor: AuthenticatedUser, id: string, status: CounterStatus) {
    const counter = await this.findCounter(id);
    assertBranchAccess(actor, counter.branchId);
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
    return this.prisma.counter.update({ where: { id }, data: { status } });
  }

  private async findCounter(id: string) {
    const counter = await this.prisma.counter.findUnique({ where: { id } });
    if (!counter) throw new NotFoundException('Counter not found');
    return counter;
  }

  private async assertServiceBranch(serviceId: string | undefined, branchId: string) {
    if (!serviceId) return;
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { branchId: true } });
    if (!service || service.branchId !== branchId) throw new BadRequestException('Service must belong to the same branch');
  }
}
