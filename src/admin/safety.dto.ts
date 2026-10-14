import {
  IsString, IsOptional, IsEnum, IsUUID, IsIn, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppealStatus } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ description: 'Type of entity being reported: user | conversation | casting | application' })
  @IsString()
  entityType: string;

  @ApiProperty()
  @IsUUID()
  entityId: string;

  @ApiProperty({ description: 'Short reason code: inappropriate_content | fraud | harassment | spam | child_safety | other' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class AddEvidenceDto {
  @ApiProperty({ enum: ['screenshot', 'url', 'text', 'media_file'] })
  @IsIn(['screenshot', 'url', 'text', 'media_file'])
  type: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class AssignReportDto {
  @ApiProperty({ description: 'Moderator user ID to assign to' })
  @IsUUID()
  moderatorId: string;
}

export class ResolveReportDto {
  @ApiProperty({ description: 'Resolution note' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  note: string;

  @ApiPropertyOptional({ enum: ['warn', 'suspend', 'ban', 'content_removed', 'no_action'] })
  @IsOptional()
  @IsIn(['warn', 'suspend', 'ban', 'content_removed', 'no_action'])
  enforcement?: string;

  @ApiPropertyOptional({ description: 'Target user ID for enforcement action' })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}

export class EscalateReportDto {
  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class EnforceUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateAppealDto {
  @ApiProperty()
  @IsUUID()
  reportId: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  reason: string;
}

export class ReviewAppealDto {
  @ApiProperty({ enum: AppealStatus })
  @IsEnum(AppealStatus)
  status: AppealStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
