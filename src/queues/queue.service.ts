import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUES, EMAIL_JOBS, SMS_JOBS, NOTIFICATION_JOBS, VIDEO_JOBS, IMAGE_JOBS, PDF_JOBS, PAYMENT_JOBS, SEARCH_JOBS, RECOMMENDATION_JOBS, MODERATION_JOBS, ANALYTICS_JOBS } from './queue.constants';
import { NotificationType } from '@prisma/client';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUES.EMAIL) private emailQ: Queue,
    @InjectQueue(QUEUES.SMS) private smsQ: Queue,
    @InjectQueue(QUEUES.NOTIFICATION) private notificationQ: Queue,
    @InjectQueue(QUEUES.VIDEO) private videoQ: Queue,
    @InjectQueue(QUEUES.IMAGE) private imageQ: Queue,
    @InjectQueue(QUEUES.PDF) private pdfQ: Queue,
    @InjectQueue(QUEUES.PAYMENT) private paymentQ: Queue,
    @InjectQueue(QUEUES.SEARCH) private searchQ: Queue,
    @InjectQueue(QUEUES.RECOMMENDATION) private recommendationQ: Queue,
    @InjectQueue(QUEUES.MODERATION) private moderationQ: Queue,
    @InjectQueue(QUEUES.ANALYTICS) private analyticsQ: Queue,
  ) {}

  // ─── Email ─────────────────────────────────────────────────────────────────
  sendEmail(to: string, subject: string, template: string, context: Record<string, any>) {
    return this.emailQ.add(EMAIL_JOBS.SEND, { to, subject, template, context });
  }

  // ─── SMS ───────────────────────────────────────────────────────────────────
  sendSms(to: string, body: string) {
    return this.smsQ.add(SMS_JOBS.SEND, { to, body });
  }
  sendOtp(to: string, otp: string) {
    return this.smsQ.add(SMS_JOBS.SEND_OTP, { to, otp });
  }

  // ─── Notifications ─────────────────────────────────────────────────────────
  sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    channels: Array<'inApp' | 'email' | 'sms' | 'push'> = ['inApp'],
  ) {
    return this.notificationQ.add(NOTIFICATION_JOBS.SEND, { userId, type, title, body, data, channels });
  }

  // ─── Media ─────────────────────────────────────────────────────────────────
  processVideo(mediaId: string, key: string, size: number) {
    return Promise.all([
      this.videoQ.add(VIDEO_JOBS.MALWARE_SCAN, { mediaId, key, size }, { priority: 1 }),
      this.videoQ.add(VIDEO_JOBS.TRANSCODE, { mediaId, key, size }, { delay: 2000 }),
      this.videoQ.add(VIDEO_JOBS.THUMBNAIL, { mediaId, key, size }, { delay: 3000 }),
      this.videoQ.add(VIDEO_JOBS.METADATA, { mediaId, key, size }, { delay: 1000 }),
    ]);
  }

  processImage(mediaId: string, key: string, contentType: string) {
    return Promise.all([
      this.imageQ.add(IMAGE_JOBS.MALWARE_SCAN, { mediaId, key, contentType }, { priority: 1 }),
      this.imageQ.add(IMAGE_JOBS.OPTIMIZE, { mediaId, key, contentType }, { delay: 1000 }),
      this.imageQ.add(IMAGE_JOBS.RESIZE, { mediaId, key, contentType }, { delay: 1500 }),
      this.imageQ.add(IMAGE_JOBS.THUMBNAIL, { mediaId, key, contentType }, { delay: 2000 }),
    ]);
  }

  // ─── PDF ───────────────────────────────────────────────────────────────────
  generateInvoice(paymentId: string, userId: string) {
    return this.pdfQ.add(PDF_JOBS.GENERATE_INVOICE, { paymentId, userId });
  }
  generateCompCard(talentId: string) {
    return this.pdfQ.add(PDF_JOBS.GENERATE_COMP_CARD, { talentId });
  }

  // ─── Payment ───────────────────────────────────────────────────────────────
  processPaymentWebhook(provider: string, event: string, data: any) {
    return this.paymentQ.add(PAYMENT_JOBS.PROCESS_WEBHOOK, { provider, event, data });
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  indexCasting(castingId: string) {
    return this.searchQ.add(SEARCH_JOBS.INDEX_CASTING, { castingId });
  }
  indexTalent(talentId: string) {
    return this.searchQ.add(SEARCH_JOBS.INDEX_TALENT, { talentId });
  }
  removeCastingFromIndex(castingId: string) {
    return this.searchQ.add(SEARCH_JOBS.REMOVE_CASTING, { castingId });
  }

  // ─── Recommendations ───────────────────────────────────────────────────────
  recomputeForTalent(talentId: string) {
    return this.recommendationQ.add(RECOMMENDATION_JOBS.RECOMPUTE_FOR_TALENT, { talentId });
  }

  // ─── Moderation ────────────────────────────────────────────────────────────
  autoReviewReport(reportId: string, entityType: string, entityId: string, reason: string) {
    return this.moderationQ.add(MODERATION_JOBS.AUTO_REVIEW, { reportId, entityType, entityId, reason });
  }
  escalateReport(reportId: string) {
    return this.moderationQ.add(MODERATION_JOBS.ESCALATE, { reportId }, { priority: 1 });
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────
  trackEvent(event: string, userId?: string, entityType?: string, entityId?: string, metadata?: Record<string, any>) {
    return this.analyticsQ.add(ANALYTICS_JOBS.TRACK_EVENT, { event, userId, entityType, entityId, metadata });
  }
}
