import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES, ANALYTICS_JOBS } from './queue.constants';
import { PrismaService } from '../database/prisma.service';

export interface TrackEventJob {
  event: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

@Processor(QUEUES.ANALYTICS)
export class AnalyticsWorker {
  private readonly logger = new Logger(AnalyticsWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(ANALYTICS_JOBS.TRACK_EVENT)
  async handleTrackEvent(job: Job<TrackEventJob>) {
    const { event, userId, entityType, entityId, metadata } = job.data;
    // Write to audit log as analytics event
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: event,
        entityType,
        entityId,
        newData: metadata,
      },
    });
  }

  @Process(ANALYTICS_JOBS.AGGREGATE_DAILY)
  async handleAggregate(job: Job<{ date: string }>) {
    this.logger.log(`Aggregating analytics for ${job.data.date}`);
    // TODO: compute daily stats and cache in Redis / write to analytics table
  }
}
