import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ description: 'Coupon code' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class CheckoutDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'URL to redirect after success' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL to redirect after cancel' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class WebhookDto {
  @IsString()
  type: string;

  data: any;
}
