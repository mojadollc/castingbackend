import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateShortlistDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class AddTalentToShortlistDto {
  @ApiProperty() @IsUUID() talentId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() applicationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ShortlistMessageDto {
  @ApiProperty() @IsString() message: string;
}
