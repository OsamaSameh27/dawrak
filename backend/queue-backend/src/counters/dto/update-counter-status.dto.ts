import { CounterStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateCounterStatusDto {
  @ApiProperty({ enum: CounterStatus })
  @IsEnum(CounterStatus)
  status: CounterStatus;
}
