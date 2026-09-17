import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'فرع مدينة نصر' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameAr: string;

  @ApiProperty({ example: 'Nasr City Branch' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameEn: string;

  @ApiProperty({ example: 'NASR' })
  @Matches(/^[A-Z0-9_-]{2,12}$/)
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  addressAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  addressEn?: string;

  @ApiPropertyOptional({ example: 30.0561 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 31.33 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ default: 'Africa/Cairo' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
