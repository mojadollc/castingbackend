import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsUUID, IsArray, IsEnum,
  IsInt, Min, Max, ValidateNested, ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '@prisma/client';

export class SubmitApplicationDto {
  @ApiProperty() @IsUUID() talentId: string;
  @ApiProperty() @IsUUID() projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverNote?: string;

  @ApiPropertyOptional({ type: [Object], description: 'Answers to role screening questions' })
  @IsOptional() @IsArray()
  answers?: { question: string; answer: string }[];

  @ApiPropertyOptional({ type: [String], description: 'mediaFileIds of uploaded assets' })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  assetIds?: string[];
}

export class ListApplicationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(ApplicationStatus) status?: ApplicationStatus;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ApplicationStatus }) @IsEnum(ApplicationStatus) status: ApplicationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class AddNoteDto {
  @ApiProperty() @IsString() note: string;
}

export class AddTagsDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) tags: string[];
}

export class BulkStatusDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) @ArrayNotEmpty() applicationIds: string[];
  @ApiProperty({ enum: ApplicationStatus }) @IsEnum(ApplicationStatus) status: ApplicationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class BulkTagDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) @ArrayNotEmpty() applicationIds: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) tags: string[];
}

export class BulkMessageDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) @ArrayNotEmpty() applicationIds: string[];
  @ApiProperty() @IsString() message: string;
}
