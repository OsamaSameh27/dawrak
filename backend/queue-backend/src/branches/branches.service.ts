import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { assertBranchAccess } from '../common/utils/branch-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, address: true, timezone: true },
      orderBy: { name: 'asc' },
    });
  }

  async getPublic(id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, isActive: true },
      select: {
        id: true, name: true, code: true, address: true, timezone: true,
        services: {
          where: { isActive: true },
          select: { id: true, name: true, prefix: true, description: true, averageServiceMinutes: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    this.assertTimezone(dto.timezone ?? 'Africa/Cairo');
    try {
      return await this.prisma.branch.create({
        data: { ...dto, name: dto.name.trim(), code: dto.code.toUpperCase() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Branch code already exists');
      }
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateBranchDto) {
    assertBranchAccess(actor, id);
    const exists = await this.prisma.branch.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Branch not found');
    if (dto.timezone) this.assertTimezone(dto.timezone);
    return this.prisma.branch.update({
      where: { id }, data: { ...dto, name: dto.name?.trim() },
    });
  }

  private assertTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch {
      throw new BadRequestException('Invalid IANA timezone');
    }
  }
}
