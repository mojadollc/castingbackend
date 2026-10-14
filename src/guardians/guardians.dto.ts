import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateGuardianProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class CreateTalentDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty() dateOfBirth: string;
  @ApiProperty() @IsString() gender: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
}

export class UpdateTalentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() height?: number;
  @ApiPropertyOptional() @IsOptional() weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() eyeColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hairColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hairLength?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() skinTone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shoeSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clothingSize?: string;
  @ApiPropertyOptional() @IsOptional() unionMember?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() unionName?: string;
  @ApiPropertyOptional() @IsOptional() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cityId?: string;
}
