import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSubscriptionDto, CheckoutDto } from './payments.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async getSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubscription(userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');

    // Check for existing active subscription
    const existing = await this.getSubscription(userId);
    if (existing) throw new BadRequestException('Already have an active subscription');

    // Apply coupon if provided
    let discount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      if (!coupon || !coupon.isActive || (coupon.expiresAt && coupon.expiresAt < new Date())) {
        throw new BadRequestException('Invalid or expired coupon');
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new BadRequestException('Coupon usage limit reached');
      }
      discount = coupon.isPercent
        ? Number(plan.price) * (Number(coupon.discount) / 100)
        : Number(coupon.discount);
      await this.prisma.coupon.update({
        where: { code: dto.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (plan.interval === 'year' ? 12 : 1));

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      }),
    ]);

    // Create pending payment record
    const finalAmount = Math.max(0, Number(plan.price) - discount);
    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        amount: finalAmount,
        currency: plan.currency,
        status: 'PENDING',
        provider: 'stripe', // stub
      },
    });

    return subscription;
  }

  async cancelSubscription(id: string, userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.userId !== userId) throw new ForbiddenException();
    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Already cancelled');
    }
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  // ─── Server-side entitlement check ────────────────────────────────────────

  async checkEntitlement(userId: string, feature: string): Promise<boolean> {
    const sub = await this.getSubscription(userId);
    if (!sub) return false;
    const features = sub.plan.features as Record<string, any> | null;
    if (!features) return false;
    return !!features[feature];
  }

  async requireEntitlement(userId: string, feature: string) {
    const allowed = await this.checkEntitlement(userId, feature);
    if (!allowed) throw new ForbiddenException(`Your plan does not include: ${feature}`);
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  async listPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: { subscription: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayment(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { subscription: { include: { plan: true } }, transactions: true, invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new ForbiddenException();
    return payment;
  }

  // ─── Checkout (Stripe stub) ────────────────────────────────────────────────

  async createCheckoutSession(userId: string, dto: CheckoutDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');

    // TODO: integrate Stripe checkout session creation
    // const session = await stripe.checkout.sessions.create({ ... })
    return {
      checkoutUrl: `https://checkout.stripe.com/stub?plan=${plan.slug}&user=${userId}`,
      planId: plan.id,
      amount: plan.price,
      currency: plan.currency,
    };
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    // TODO: verify Stripe webhook signature
    // const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    // Handle: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
    return { received: true };
  }

  // ─── Invoices ──────────────────────────────────────────────────────────────

  async listInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { payment: { userId } },
      include: { payment: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getInvoice(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.payment.userId !== userId) throw new ForbiddenException();
    return invoice;
  }
}
