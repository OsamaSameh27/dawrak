import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CallNextDto {
  @ApiProperty()
  @IsUUID()
  counterId: string;
}
