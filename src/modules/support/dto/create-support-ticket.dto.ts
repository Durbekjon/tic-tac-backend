import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Some text' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'User id' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
