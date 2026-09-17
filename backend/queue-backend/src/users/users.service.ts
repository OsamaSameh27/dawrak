import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { assertBranchAccess } from '../common/utils/branch-access';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from '../queues/queue.gateway';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: QueueGateway,
  ) {}

  async list(actor: AuthenticatedUser, branchId?: string) {
    const effectiveBranchId = actor.role === Role.ADMIN ? branchId : actor.branchId ?? undefined;
    return this.prisma.user.findMany({
      where: {
        branchId: effectiveBranchId,
        role: actor.role === Role.ADMIN
          ? { in: [Role.STAFF, Role.MANAGER] }
          : Role.STAFF,
      },
      select: this.safeSelect(),
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  }

  async createStaff(actor: AuthenticatedUser, dto: CreateStaffDto) {
    assertBranchAccess(actor, dto.branchId);
    if (actor.role === Role.MANAGER && dto.role !== Role.STAFF) {
      throw new ForbiddenException('Managers can only create staff accounts');
    }
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId }, select: { id: true } });
    if (!branch) throw new NotFoundException('Branch not found');
    const email = dto.email.trim().toLowerCase();
    const duplicate = await this.prisma.user.findFirst({
      where: { OR: [{ email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Email or phone is already registered');

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        fullName: dto.fullName.trim(),
        phone: dto.phone,
        role: dto.role,
        branchId: dto.branchId,
      },
      select: this.safeSelect(),
    });
    if (created.role === Role.MANAGER) {
      await this.gateway.notifyAdmins({
        type: NotificationType.TICKET_UPDATED,
        title: 'notifications.types.managerCreated.title',
        message: 'notifications.types.managerCreated.message',
        data: { managerName: created.fullName, branchCode: created.branch?.code ?? '' },
      });
    }
    return created;
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    if (!target.branchId) throw new ForbiddenException('This account cannot be managed here');
    assertBranchAccess(actor, target.branchId);
    if (dto.branchId) {
      assertBranchAccess(actor, dto.branchId);
      const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId }, select: { id: true } });
      if (!branch) throw new NotFoundException('Branch not found');
    }
    if (actor.role === Role.MANAGER && (target.role !== Role.STAFF || dto.role === Role.MANAGER)) {
      throw new ForbiddenException('Managers can only update staff accounts');
    }
    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          fullName: dto.fullName?.trim(), phone: dto.phone, role: dto.role,
          branchId: dto.branchId, isActive: dto.isActive,
        },
        select: this.safeSelect(),
      });
      if (target.role === Role.MANAGER || updated.role === Role.MANAGER) {
        await this.gateway.notifyAdmins({
          type: NotificationType.TICKET_UPDATED,
          title: 'notifications.types.managerUpdated.title',
          message: 'notifications.types.managerUpdated.message',
          data: { managerName: updated.fullName, branchCode: updated.branch?.code ?? '' },
        });
      }
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Phone is already registered');
      }
      throw error;
    }
  }

  private safeSelect() {
    return {
      id: true, email: true, fullName: true, phone: true, role: true, branchId: true,
      isActive: true, createdAt: true, updatedAt: true,
      branch: { select: { id: true, name: true, nameAr: true, nameEn: true, code: true } },
    } as const;
  }
}
