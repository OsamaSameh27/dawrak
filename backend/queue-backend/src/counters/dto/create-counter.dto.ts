import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateCounterDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(999)
  number: number;
}
