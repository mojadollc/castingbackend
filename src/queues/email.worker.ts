import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES, EMAIL_JOBS } from './queue.constants';

export interface SendEmailJob {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export interface SendBulkEmailJob {
  recipients: Array<{ to: string; context: Record<string, any> }>;
  subject: string;
  template: string;
}

@Processor(QUEUES.EMAIL)
export class EmailWorker {
  private readonly logger = new Logger(EmailWorker.name);

  @Process(EMAIL_JOBS.SEND)
  async handleSend(job: Job<SendEmailJob>) {
    const { to, subject, template } = job.data;
    this.logger.log(`Sending email to ${to} [${template}]`);
    // TODO: integrate Nodemailer / SendGrid / SES
    // await this.mailer.sendMail({ to, subject, template, context })
  }

  @Process(EMAIL_JOBS.SEND_BULK)
  async handleBulk(job: Job<SendBulkEmailJob>) {
    const { recipients, subject, template } = job.data;
    this.logger.log(`Sending bulk email [${template}] to ${recipients.length} recipients`);
    // TODO: batch send via provider
  }
}
