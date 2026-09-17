import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { CountersController } from './counters.controller';
import { CountersService } from './counters.service';

@Module({
  imports: [QueuesModule],
  controllers: [CountersController],
  providers: [CountersService],
  exports: [CountersService],
})
export class CountersModule {}
