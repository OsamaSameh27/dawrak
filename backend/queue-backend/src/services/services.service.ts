import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { assertBranchAccess } from '../common/utils/branch-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(branchId: string) {
    return this.prisma.service.findMany({
      where: { branchId, isActive: true, branch: { isActive: true } },
      select: {
        id: true, branchId: true, name: true, nameAr: true, nameEn: true, prefix: true,
        description: true, descriptionAr: true, descriptionEn: true,
        averageServiceMinutes: true, nearTurnThreshold: true,
        _count: { select: { counters: { where: { status: 'OPEN' } } } },
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  listManagement(actor: AuthenticatedUser, branchId?: string) {
    const effectiveBranchId = actor.role === Role.ADMIN ? branchId : actor.branchId ?? undefined;
    return this.prisma.service.findMany({
      where: { branchId: effectiveBranchId },
      select: {
        id: true, branchId: true, name: true, nameAr: true, nameEn: true, prefix: true,
        description: true, descriptionAr: true, descriptionEn: true,
        averageServiceMinutes: true, nearTurnThreshold: true, isActive: true,
        createdAt: true, updatedAt: true,
        branch: { select: { id: true, name: true, nameAr: true, nameEn: true, code: true } },
        _count: { select: { counters: true, tickets: true } },
      },
      orderBy: [{ branchId: 'asc' }, { nameEn: 'asc' }],
    });
  }

  async getPublic(id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, isActive: true, branch: { isActive: true } },
      select: {
        id: true, branchId: true, name: true, nameAr: true, nameEn: true, prefix: true,
        description: true, descriptionAr: true, descriptionEn: true,
        averageServiceMinutes: true, nearTurnThreshold: true,
        branch: { select: { id: true, name: true, nameAr: true, nameEn: true, code: true } },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(actor: AuthenticatedUser, dto: CreateServiceDto) {
    assertBranchAccess(actor, dto.branchId);
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    try {
      return await this.prisma.service.create({
        data: {
          ...dto,
          nameAr: dto.nameAr.trim(), nameEn: dto.nameEn.trim(), name: dto.nameEn.trim(),
          descriptionAr: dto.descriptionAr?.trim(), descriptionEn: dto.descriptionEn?.trim(),
          description: dto.descriptionEn?.trim(), prefix: dto.prefix.toUpperCase(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Service prefix already exists in this branch');
      }
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id }, select: { branchId: true } });
    if (!service) throw new NotFoundException('Service not found');
    assertBranchAccess(actor, service.branchId);
    return this.prisma.service.update({
      where: { id },
      data: {
        ...dto,
        nameAr: dto.nameAr?.trim(), nameEn: dto.nameEn?.trim(), name: dto.nameEn?.trim(),
        descriptionAr: dto.descriptionAr?.trim(), descriptionEn: dto.descriptionEn?.trim(),
        description: dto.descriptionEn?.trim(),
      },
    });
  }
}
