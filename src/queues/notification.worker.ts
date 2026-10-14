import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { QUEUES, NOTIFICATION_JOBS, EMAIL_JOBS, SMS_JOBS } from './queue.constants';
import { PrismaService } from '../database/prisma.service';
import { NotificationType } from '@prisma/client';

export interface SendNotificationJob {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels?: Array<'inApp' | 'email' | 'sms' | 'push'>;
}

@Processor(QUEUES.NOTIFICATION)
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUES.SMS) private readonly smsQueue: Queue,
  ) {}

  @Process(NOTIFICATION_JOBS.SEND)
  async handleSend(job: Job<SendNotificationJob>) {
    const { userId, type, title, body, data, channels = ['inApp'] } = job.data;

    // Always persist in-app notification
    if (channels.includes('inApp')) {
      await this.prisma.notification.create({
        data: { userId, type, title, body, data },
      });
    }

    // Get user contact info for other channels
    if (channels.includes('email') || channels.includes('sms')) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true },
      });

      const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });

      if (channels.includes('email') && user?.email && (!prefs || prefs.email)) {
        await this.emailQueue.add(EMAIL_JOBS.SEND, {
          to: user.email,
          subject: title,
          template: 'notification',
          context: { title, body, data },
        });
      }

      if (channels.includes('sms') && user?.phone && (!prefs || prefs.sms)) {
        await this.smsQueue.add(SMS_JOBS.SEND, { to: user.phone, body: `${title}: ${body}` });
      }
    }

    this.logger.log(`Notification dispatched for user ${userId} [${type}]`);
  }
}
