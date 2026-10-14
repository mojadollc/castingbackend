import {
  Controller, Get, Post, Body, Param, Headers, RawBodyRequest, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateSubscriptionDto, CheckoutDto } from './payments.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../auth/auth.guards';

@ApiTags('Payments & Subscriptions')
@Controller()
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List subscription plans' })
  listPlans() {
    return this.svc.listPlans();
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('subscriptions')
  @ApiOperation({ summary: 'Get my active subscription' })
  getSubscription(@CurrentUser('id') userId: string) {
    return this.svc.getSubscription(userId);
  }

  @ApiBearerAuth()
  @Post('subscriptions')
  @ApiOperation({ summary: 'Create subscription' })
  createSubscription(@CurrentUser('id') userId: string, @Body() dto: CreateSubscriptionDto) {
    return this.svc.createSubscription(userId, dto);
  }

  @ApiBearerAuth()
  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  cancelSubscription(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.cancelSubscription(id, userId);
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('payments')
  @ApiOperation({ summary: 'List my payments' })
  listPayments(@CurrentUser('id') userId: string) {
    return this.svc.listPayments(userId);
  }

  @ApiBearerAuth()
  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment details' })
  getPayment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.getPayment(id, userId);
  }

  @ApiBearerAuth()
  @Post('payments/checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.svc.createCheckoutSession(userId, dto);
  }

  @Public()
  @Post('payments/webhook')
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.svc.handleWebhook(req.rawBody!, sig);
  }

  // ─── Invoices ──────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('invoices')
  @ApiOperation({ summary: 'List my invoices' })
  listInvoices(@CurrentUser('id') userId: string) {
    return this.svc.listInvoices(userId);
  }

  @ApiBearerAuth()
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice' })
  getInvoice(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.getInvoice(id, userId);
  }
}
