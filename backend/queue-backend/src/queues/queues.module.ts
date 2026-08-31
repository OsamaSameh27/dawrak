import { Module } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Module({
  controllers: [QueuesController],
  providers: [QueuesService, QueueGateway],
  exports: [QueuesService, QueueGateway],
})
export class QueuesModule {}
