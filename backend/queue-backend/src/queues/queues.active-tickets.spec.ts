import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { QueuesController } from './queues.controller';
import { QueueGateway } from './queue.gateway';
import { QueuesService } from './queues.service';

describe('Current customer tickets', () => {
  let service: QueuesService;
  const findMany = jest.fn();
  beforeEach(async () => {
    findMany.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        QueuesService,
        { provide: PrismaService, useValue: { ticket: { findMany } } },
        { provide: QueueGateway, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();
    service = module.get(QueuesService);
  });

  it('filters by the authenticated customer and all three active statuses before loading details', async () => {
    findMany.mockResolvedValue([]);
    expect(await service.getActiveMine('signed-in-user')).toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        customerId: 'signed-in-user',
        status: { in: [TicketStatus.WAITING, TicketStatus.CALLED, TicketStatus.SERVING] },
      },
      select: { publicId: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('excludes tickets that complete while their details are loading', async () => {
    findMany.mockResolvedValue([{ publicId: 'active' }, { publicId: 'finished' }]);
    jest.spyOn(service, 'getPublicTicket').mockImplementation(async (publicId) => ({
      publicId,
      status: publicId === 'active' ? TicketStatus.CALLED : TicketStatus.COMPLETED,
    } as Awaited<ReturnType<QueuesService['getPublicTicket']>>));
    expect(await service.getActiveMine('owner')).toEqual([{ publicId: 'active', status: TicketStatus.CALLED }]);
  });

  it('does not change the existing history query', async () => {
    findMany.mockResolvedValue([]);
    await service.getMine('owner');
    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'owner' }, select: { publicId: true }, orderBy: { createdAt: 'desc' }, take: 50,
    });
  });

  it('requires customer authentication and uses the user supplied by the guard', async () => {
    const getActiveMine = jest.spyOn(service, 'getActiveMine').mockResolvedValue([]);
    const controller = new QueuesController(service);
    expect(Reflect.getMetadata(ROLES_KEY, controller.activeMine)).toEqual([Role.CUSTOMER]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller.activeMine)).not.toBe(true);
    await controller.activeMine({ id: 'authenticated-owner', role: Role.CUSTOMER } as Parameters<QueuesController['activeMine']>[0]);
    expect(getActiveMine).toHaveBeenCalledWith('authenticated-owner');
  });
});
