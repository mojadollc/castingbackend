import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID, IsOptional, IsString, IsDateString, IsEnum, IsUrl,
} from 'class-validator';
import { AuditionType } from '@prisma/client';

export class CreateAuditionDto {
  @ApiProperty() @IsUUID() applicationId: string;
  @ApiProperty({ enum: AuditionType }) @IsEnum(AuditionType) type: AuditionType;

  @ApiPropertyOptional({ description: 'Required for IN_PERSON and VIRTUAL' })
  @IsOptional() @IsDateString() scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Required for IN_PERSON' })
  @IsOptional() @IsString() location?: string;

  @ApiPropertyOptional({ description: 'Required for VIRTUAL' })
  @IsOptional() @IsString() meetingUrl?: string;

  @ApiPropertyOptional({ description: 'Due date for SELF_TAPE submissions' })
  @IsOptional() @IsDateString() selfTapeDueAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAuditionDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() meetingUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() selfTapeDueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}

export class SubmitSelfTapeDto {
  @ApiProperty({ description: 'CDN URL or mediaFileId of the self-tape video' })
  @IsString() selfTapeUrl: string;
}

export class ScheduleCallbackDto {
  @ApiProperty() @IsDateString() callbackAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() meetingUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
