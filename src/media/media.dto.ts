import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, IsIn, Max } from 'class-validator';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
const ALLOWED_DOC_TYPES = ['application/pdf'];

export const ALLOWED_CONTENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_DOC_TYPES,
];

export const MAX_FILE_SIZES: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'video/mp4': 500 * 1024 * 1024,
  'video/quicktime': 500 * 1024 * 1024,
  'video/x-msvideo': 500 * 1024 * 1024,
  'audio/mpeg': 50 * 1024 * 1024,
  'audio/wav': 50 * 1024 * 1024,
  'audio/mp4': 50 * 1024 * 1024,
  'application/pdf': 20 * 1024 * 1024,
};

export class RequestUploadUrlDto {
  @ApiProperty({ example: 'demo-reel.mp4' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'video/mp4', enum: ALLOWED_CONTENT_TYPES })
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType: string;

  @ApiProperty({ example: 25000000 })
  @IsNumber()
  size: number;
}

export class CompleteUploadDto {
  @ApiProperty()
  @IsUUID()
  mediaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  etag?: string;
}
