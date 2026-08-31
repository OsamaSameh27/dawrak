import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active services in a branch' })
  list(@Query('branchId', ParseUUIDPipe) branchId: string) { return this.services.listPublic(branchId); }

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.services.getPublic(id); }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.MANAGER, Role.ADMIN)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateServiceDto) {
    return this.services.create(actor, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.MANAGER, Role.ADMIN)
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) { return this.services.update(actor, id, dto); }
}
