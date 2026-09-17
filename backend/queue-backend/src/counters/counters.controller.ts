import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CountersService } from './counters.service';
import { CreateCounterDto } from './dto/create-counter.dto';
import { UpdateCounterStatusDto } from './dto/update-counter-status.dto';
import { UpdateCounterDto } from './dto/update-counter.dto';

@ApiTags('Counters')
@ApiBearerAuth()
@Controller('counters')
export class CountersController {
  constructor(private readonly counters: CountersService) {}

  @Get()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('branchId', new ParseUUIDPipe({ optional: true })) branchId?: string,
  ) {
    return this.counters.list(actor, branchId);
  }

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateCounterDto) {
    return this.counters.create(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.MANAGER, Role.ADMIN)
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCounterDto,
  ) { return this.counters.update(actor, id, dto); }

  @Patch(':id/status')
  @Roles(Role.STAFF)
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCounterStatusDto,
  ) { return this.counters.updateStatus(actor, id, dto.status); }

  @Post(':id/claim')
  @Roles(Role.STAFF)
  claim(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) { return this.counters.claim(actor, id); }

  @Patch(':id/heartbeat')
  @Roles(Role.STAFF)
  heartbeat(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) { return this.counters.heartbeat(actor, id); }

  @Delete(':id/claim')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.STAFF)
  async release(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> { await this.counters.release(actor, id); }

  @Get(':id/shifts')
  @Roles(Role.MANAGER, Role.ADMIN)
  shifts(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) { return this.counters.shiftHistory(actor, id); }
}
