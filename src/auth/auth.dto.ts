import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsString, MinLength, IsOptional,
  IsEnum, IsMobilePhone,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsMobilePhone() phone?: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: UserRole, default: UserRole.GUARDIAN })
  @IsEnum(UserRole) role: UserRole;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}

export class RefreshTokenDto {
  @ApiProperty() @IsString() refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @IsString() @MinLength(8) newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty() @IsString() token: string;
}

export class SendOtpDto {
  @ApiProperty() @IsMobilePhone() phone: string;
}

export class VerifyOtpDto {
  @ApiProperty() @IsMobilePhone() phone: string;
  @ApiProperty() @IsString() otp: string;
}
