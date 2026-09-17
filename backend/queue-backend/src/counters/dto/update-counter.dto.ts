import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class UpdateCounterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  serviceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  number?: number;
}
