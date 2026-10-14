import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsEnum, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AuditionMethod } from '@prisma/client';

export class PublicCastingSearchDto {
  @ApiPropertyOptional({ example: 'actor' })
  @IsOptional() @IsString() keyword?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional() @IsString() country?: string;

  @ApiPropertyOptional({ example: 'Vancouver' })
  @IsOptional() @IsString() city?: string;

  @ApiPropertyOptional({ example: 'acting' })
  @IsOptional() @IsString() category?: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minAge?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxAge?: number;

  @ApiPropertyOptional({ enum: AuditionMethod })
  @IsOptional() @IsEnum(AuditionMethod) auditionMethod?: AuditionMethod;

  @ApiPropertyOptional()
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() paid?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() remote?: boolean;

  @ApiPropertyOptional({ enum: ['latest', 'deadline', 'popular'], default: 'latest' })
  @IsOptional() @IsString() sort?: 'latest' | 'deadline' | 'popular' = 'latest';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
