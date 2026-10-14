import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from './queue.constants';
import { QueueService } from './queue.service';
import { EmailWorker } from './email.worker';
import { SmsWorker } from './sms.worker';
import { NotificationWorker } from './notification.worker';
import { VideoWorker } from './video.worker';
import { ImageWorker } from './image.worker';
import { PdfWorker } from './pdf.worker';
import { PaymentWorker } from './payment.worker';
import { SearchWorker } from './search.worker';
import { RecommendationWorker, ModerationWorker } from './other.workers';
import { AnalyticsWorker } from './analytics.worker';

const queueNames = Object.values(QUEUES);

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    ...queueNames.map((name) => BullModule.registerQueue({ name })),
  ],
  providers: [
    QueueService,
    EmailWorker,
    SmsWorker,
    NotificationWorker,
    VideoWorker,
    ImageWorker,
    PdfWorker,
    PaymentWorker,
    SearchWorker,
    RecommendationWorker,
    ModerationWorker,
    AnalyticsWorker,
  ],
  exports: [QueueService, ...queueNames.map((name) => BullModule.registerQueue({ name }))],
})
export class QueuesModule {}
