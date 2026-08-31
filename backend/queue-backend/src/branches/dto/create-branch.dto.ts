import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Nasr City Branch' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'NASR' })
  @Matches(/^[A-Z0-9_-]{2,12}$/)
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @ApiPropertyOptional({ default: 'Africa/Cairo' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
