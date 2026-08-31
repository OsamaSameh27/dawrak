import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CancelGuestTicketDto {
  @ApiProperty({ description: 'One-time management token returned when the guest ticket was created' })
  @IsString()
  @Length(64, 64)
  manageToken: string;
}
