import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CallNextDto } from './dto/call-next.dto';
import { CancelGuestTicketDto } from './dto/cancel-guest-ticket.dto';
import { CreateGuestTicketDto } from './dto/create-guest-ticket.dto';
import { CreateMyTicketDto } from './dto/create-my-ticket.dto';
import { TransitionTicketDto } from './dto/transition-ticket.dto';
import { QueuesService } from './queues.service';

@ApiTags('Queues')
@Controller('queues')
export class QueuesController {
  constructor(private readonly queues: QueuesService) {}

  @Public()
  @Post('public/tickets')
  @ApiOperation({ summary: 'Create a guest queue ticket' })
  createGuest(@Body() dto: CreateGuestTicketDto) { return this.queues.createGuest(dto); }

  @Public()
  @Get('public/tickets/:publicId')
  @ApiOperation({ summary: 'Track a ticket without logging in' })
  getPublic(@Param('publicId', ParseUUIDPipe) publicId: string) {
    return this.queues.getPublicTicket(publicId);
  }

  @Public()
  @Post('public/tickets/:publicId/cancel')
  cancelGuest(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() dto: CancelGuestTicketDto,
  ) { return this.queues.cancelGuest(publicId, dto.manageToken); }

  @Public()
  @Get('public/services/:serviceId/snapshot')
  @ApiOperation({ summary: 'Public, privacy-safe live queue snapshot' })
  snapshot(@Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.queues.getSnapshot(serviceId);
  }

  @Post('tickets')
  @ApiBearerAuth()
  @Roles(Role.CUSTOMER)
  createMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMyTicketDto) {
    return this.queues.createMine(user, dto);
  }

  @Get('tickets/mine')
  @ApiBearerAuth()
  @Roles(Role.CUSTOMER)
  mine(@CurrentUser() user: AuthenticatedUser) { return this.queues.getMine(user.id); }

  @Get('tickets/mine/active')
  @ApiBearerAuth()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get only the signed-in customer’s active tickets' })
  activeMine(@CurrentUser() user: AuthenticatedUser) {
    return this.queues.getActiveMine(user.id);
  }

  @Post('tickets/:id/cancel')
  @ApiBearerAuth()
  @Roles(Role.CUSTOMER)
  cancelMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) { return this.queues.cancelMine(user, id); }

  @Get('services/:serviceId/tickets')
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  operationalList(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) { return this.queues.listOperational(actor, serviceId); }

  @Post('services/:serviceId/call-next')
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  callNext(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: CallNextDto,
  ) { return this.queues.callNext(actor, serviceId, dto); }

  @Post('tickets/:id/recall')
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  recall(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTicketDto,
  ) { return this.queues.recall(actor, id, dto.note); }

  @Post('tickets/:id/start')
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  start(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTicketDto,
  ) { return this.queues.start(actor, id, dto.note); }

  @Post('tickets/:id/complete')
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  complete(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTicketDto,
  ) { return this.queues.complete(actor, id, dto.note); }

  @Post('tickets/:id/skip')
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  skip(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTicketDto,
  ) { return this.queues.skip(actor, id, dto.note); }

  @Post('tickets/:id/no-show')
  @ApiBearerAuth()
  @Roles(Role.STAFF, Role.MANAGER, Role.ADMIN)
  noShow(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTicketDto,
  ) { return this.queues.noShow(actor, id, dto.note); }
}
