import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { QUEUES, PAYMENT_JOBS, PDF_JOBS } from './queue.constants';
import { PrismaService } from '../database/prisma.service';

export interface ProcessWebhookJob { provider: string; event: string; data: any; }
export interface RetryFailedJob { paymentId: string; }
export interface SendReceiptJob { paymentId: string; userId: string; }

@Processor(QUEUES.PAYMENT)
export class PaymentWorker {
  private readonly logger = new Logger(PaymentWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.PDF) private readonly pdfQueue: Queue,
  ) {}

  @Process(PAYMENT_JOBS.PROCESS_WEBHOOK)
  async handleWebhook(job: Job<ProcessWebhookJob>) {
    const { provider, event, data } = job.data;
    this.logger.log(`Processing ${provider} webhook: ${event}`);

    if (event === 'checkout.session.completed' || event === 'invoice.payment_succeeded') {
      const subscriptionId = data.subscription;
      if (subscriptionId) {
        await this.prisma.subscription.updateMany({
          where: { id: subscriptionId },
          data: { status: 'ACTIVE' },
        });
      }
      // Queue invoice PDF generation
      if (data.paymentId) {
        await this.pdfQueue.add(PDF_JOBS.GENERATE_INVOICE, {
          paymentId: data.paymentId,
          userId: data.userId,
        });
      }
    }

    if (event === 'customer.subscription.deleted') {
      await this.prisma.subscription.updateMany({
        where: { id: data.subscription },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }
  }

  @Process(PAYMENT_JOBS.RETRY_FAILED)
  async handleRetry(job: Job<RetryFailedJob>) {
    this.logger.log(`Retrying payment ${job.data.paymentId}`);
    // TODO: re-attempt charge via Stripe
  }

  @Process(PAYMENT_JOBS.SEND_RECEIPT)
  async handleReceipt(job: Job<SendReceiptJob>) {
    this.logger.log(`Sending receipt for payment ${job.data.paymentId}`);
    // Handled by PDF worker + email worker chain
  }
}
