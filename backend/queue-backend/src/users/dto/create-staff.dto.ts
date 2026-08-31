import { Role } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  password: string;

  @ApiProperty({ example: 'Staff Member' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: '+201001234567' })
  @IsOptional()
  @Matches(/^\+?[0-9]{8,15}$/)
  phone?: string;

  @ApiProperty({ enum: [Role.STAFF, Role.MANAGER] })
  @IsIn([Role.STAFF, Role.MANAGER])
  role: Role;

  @ApiProperty()
  @IsUUID()
  branchId: string;
}
