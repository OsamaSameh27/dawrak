import { Role } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Matches(/^\+?[0-9]{8,15}$/)
  phone?: string | null;

  @ApiPropertyOptional({ enum: [Role.STAFF, Role.MANAGER] })
  @IsOptional()
  @IsIn([Role.STAFF, Role.MANAGER])
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
