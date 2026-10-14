import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES, SMS_JOBS } from './queue.constants';

export interface SendSmsJob { to: string; body: string; }
export interface SendOtpJob { to: string; otp: string; }

@Processor(QUEUES.SMS)
export class SmsWorker {
  private readonly logger = new Logger(SmsWorker.name);

  @Process(SMS_JOBS.SEND)
  async handleSend(job: Job<SendSmsJob>) {
    this.logger.log(`Sending SMS to ${job.data.to}`);
    // TODO: integrate Twilio
  }

  @Process(SMS_JOBS.SEND_OTP)
  async handleOtp(job: Job<SendOtpJob>) {
    this.logger.log(`Sending OTP to ${job.data.to}`);
    // TODO: integrate Twilio
  }
}
