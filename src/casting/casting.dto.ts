import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsBoolean, IsDateString,
  IsEnum, IsUUID, IsInt, IsNumber, IsArray, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditionMethod, Gender } from '@prisma/client';

// ─── Project DTOs ─────────────────────────────────────────────────────────────

export class CreateCastingDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectType?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AuditionMethod) auditionMethod?: AuditionMethod;
  @ApiPropertyOptional() @IsOptional() @IsDateString() applicationStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() applicationEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() shootStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() shootEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRemote?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() compensation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() organizationId?: string;
}

export class UpdateCastingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectType?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AuditionMethod) auditionMethod?: AuditionMethod;
  @ApiPropertyOptional() @IsOptional() @IsDateString() applicationStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() applicationEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() shootStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() shootEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRemote?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() compensation?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class ListCastingsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectType?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}

export class ExtendCastingDto {
  @ApiProperty({ description: 'New application end date' })
  @IsDateString()
  applicationEnd: string;
}

// ─── Role DTOs ────────────────────────────────────────────────────────────────

export class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(Gender) genderReq?: Gender;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) ageMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) ageMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() experienceLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() languages?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRemote?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() compensation?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() compensationAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() compensationCurrency?: string;
  @ApiPropertyOptional() @IsOptional() applicationRequirements?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) spotsTotal?: number;
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(Gender) genderReq?: Gender;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) ageMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) ageMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() experienceLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() languages?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRemote?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() compensation?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() compensationAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() compensationCurrency?: string;
  @ApiPropertyOptional() @IsOptional() applicationRequirements?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) spotsTotal?: number;
}
