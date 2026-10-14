import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';

export class UpdateProfessionalProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() countryId?: string;
}

export class UploadDocumentDto {
  @ApiProperty({ description: 'mediaFileId returned from POST /media/upload-url after completion' })
  @IsUUID()
  mediaFileId: string;

  @ApiProperty({ example: 'ID_CARD', description: 'Document type: ID_CARD, BUSINESS_LICENSE, PORTFOLIO, etc.' })
  @IsString()
  docType: string;
}
