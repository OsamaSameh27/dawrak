import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [QueuesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
