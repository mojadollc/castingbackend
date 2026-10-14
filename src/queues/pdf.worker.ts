import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES, PDF_JOBS } from './queue.constants';
import { PrismaService } from '../database/prisma.service';

export interface GenerateInvoiceJob { paymentId: string; userId: string; }
export interface GenerateCompCardJob { talentId: string; }

@Processor(QUEUES.PDF)
export class PdfWorker {
  private readonly logger = new Logger(PdfWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(PDF_JOBS.GENERATE_INVOICE)
  async handleInvoice(job: Job<GenerateInvoiceJob>) {
    this.logger.log(`Generating invoice for payment ${job.data.paymentId}`);
    // TODO: puppeteer / pdfkit — render invoice HTML → PDF → upload to S3
    // Then: prisma.invoice.update({ where: { paymentId }, data: { pdfUrl } })
  }

  @Process(PDF_JOBS.GENERATE_COMP_CARD)
  async handleCompCard(job: Job<GenerateCompCardJob>) {
    this.logger.log(`Generating comp card for talent ${job.data.talentId}`);
    // TODO: puppeteer — render comp card template → PDF → upload to S3
  }
}
