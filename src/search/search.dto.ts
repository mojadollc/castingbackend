import { IsOptional, IsString, IsInt, IsBoolean, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class SearchCastingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectType?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() isPaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() isRemote?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) ageMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) ageMax?: number;
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional({ description: 'Comma-separated skill names' }) @IsOptional() @IsString() skills?: string;
  @ApiPropertyOptional({ description: 'Comma-separated language codes' }) @IsOptional() @IsString() languages?: string;
  @ApiPropertyOptional({ enum: ['newest', 'deadline', 'popular'] }) @IsOptional() @IsString() sort?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}

export class SearchTalentsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) ageMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) ageMax?: number;
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional({ description: 'Comma-separated skill names' }) @IsOptional() @IsString() skills?: string;
  @ApiPropertyOptional({ description: 'Comma-separated language codes' }) @IsOptional() @IsString() languages?: string;
  @ApiPropertyOptional({ description: 'Comma-separated accent strings' }) @IsOptional() @IsString() accents?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() heightMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() heightMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() hairColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eyeColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() experienceLevel?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() hasPhotos?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() hasVideos?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) minCompletion?: number;
  @ApiPropertyOptional({ enum: ['newest', 'completion', 'name'] }) @IsOptional() @IsString() sort?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}
