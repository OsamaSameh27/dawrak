import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ example: 'كشف الأسنان' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameAr: string;

  @ApiProperty({ example: 'Dental examination' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameEn: string;

  @ApiProperty({ example: 'D' })
  @Matches(/^[A-Z0-9]{1,5}$/)
  prefix: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descriptionAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descriptionEn?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  averageServiceMinutes?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  nearTurnThreshold?: number;
}
