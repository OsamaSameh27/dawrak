import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QueuesModule } from '../queues/queues.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [JwtModule.register({ global: true }), QueuesModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
