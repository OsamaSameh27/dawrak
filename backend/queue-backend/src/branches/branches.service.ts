import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { assertBranchAccess } from '../common/utils/branch-access';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from '../queues/queue.gateway';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: QueueGateway,
  ) {}

  listPublic() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, nameAr: true, nameEn: true, code: true,
        address: true, addressAr: true, addressEn: true, latitude: true, longitude: true, timezone: true,
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  listManaged(actor: AuthenticatedUser) {
    return this.prisma.branch.findMany({
      where: actor.role === 'ADMIN' ? undefined : { id: actor.branchId ?? undefined },
      select: {
        id: true, name: true, nameAr: true, nameEn: true, code: true,
        address: true, addressAr: true, addressEn: true,
        latitude: true, longitude: true, timezone: true, isActive: true,
        createdAt: true, updatedAt: true,
        _count: { select: { services: true, counters: true, users: true } },
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  async getPublic(id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, isActive: true },
      select: {
        id: true, name: true, nameAr: true, nameEn: true, code: true,
        address: true, addressAr: true, addressEn: true, latitude: true, longitude: true, timezone: true,
        services: {
          where: { isActive: true },
          select: {
            id: true, name: true, nameAr: true, nameEn: true, prefix: true,
            description: true, descriptionAr: true, descriptionEn: true, averageServiceMinutes: true,
          },
          orderBy: { nameEn: 'asc' },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    this.assertTimezone(dto.timezone ?? 'Africa/Cairo');
    this.assertLocationPair(dto.latitude, dto.longitude);
    try {
      const branch = await this.prisma.branch.create({
        data: {
          ...dto,
          nameAr: dto.nameAr.trim(), nameEn: dto.nameEn.trim(), name: dto.nameEn.trim(),
          addressAr: dto.addressAr?.trim(), addressEn: dto.addressEn?.trim(), address: dto.addressEn?.trim(),
          code: dto.code.toUpperCase(),
        },
      });
      await this.gateway.notifyAdmins({
        type: NotificationType.TICKET_UPDATED,
        title: 'notifications.types.branchCreated.title',
        message: 'notifications.types.branchCreated.message',
        data: { branchCode: branch.code },
      });
      return branch;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Branch code already exists');
      }
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateBranchDto) {
    assertBranchAccess(actor, id);
    const exists = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true, code: true, latitude: true, longitude: true },
    });
    if (!exists) throw new NotFoundException('Branch not found');
    if (dto.timezone) this.assertTimezone(dto.timezone);
    this.assertLocationPair(
      dto.latitude === undefined ? exists.latitude : dto.latitude,
      dto.longitude === undefined ? exists.longitude : dto.longitude,
    );
    const branch = await this.prisma.branch.update({
      where: { id },
      data: {
        ...dto,
        nameAr: dto.nameAr?.trim(), nameEn: dto.nameEn?.trim(),
        name: dto.nameEn?.trim(),
        addressAr: dto.addressAr?.trim(), addressEn: dto.addressEn?.trim(),
        address: dto.addressEn?.trim(),
      },
    });
    await this.gateway.notifyAdmins({
      type: NotificationType.TICKET_UPDATED,
      title: 'notifications.types.branchUpdated.title',
      message: 'notifications.types.branchUpdated.message',
      data: { branchCode: branch.code },
    });
    return branch;
  }

  private assertTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch {
      throw new BadRequestException('Invalid IANA timezone');
    }
  }

  private assertLocationPair(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): void {
    if ((latitude == null) !== (longitude == null)) {
      throw new BadRequestException('Latitude and longitude must be provided together');
    }
  }
}
