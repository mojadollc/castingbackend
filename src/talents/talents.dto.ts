import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsInt, IsBoolean, IsArray } from 'class-validator';

export class UpdateTalentProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() height?: number;
  @ApiPropertyOptional() @IsOptional() weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() eyeColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hairColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hairLength?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() skinTone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shoeSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clothingSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() unionMember?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() unionName?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cityId?: string;
}

export class UpdatePhotoDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class AddVideoDto {
  @ApiProperty() @IsUUID() mediaFileId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class AddAudioDto {
  @ApiProperty() @IsUUID() mediaFileId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
}

export class SetSkillsDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  skills: { skillId: string; level?: string }[];
}

export class SetLanguagesDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  languages: { languageId: string; fluency?: string }[];
}

export class CreateCreditDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() director?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateCreditDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() director?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
