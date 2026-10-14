import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES, RECOMMENDATION_JOBS, MODERATION_JOBS } from './queue.constants';
import { PrismaService } from '../database/prisma.service';

// ─── Recommendation Worker ────────────────────────────────────────────────────

export interface RecomputeTalentJob { talentId: string; }
export interface RecomputeCastingJob { castingId: string; }

@Processor(QUEUES.RECOMMENDATION)
export class RecommendationWorker {
  private readonly logger = new Logger(RecommendationWorker.name);

  @Process(RECOMMENDATION_JOBS.RECOMPUTE_FOR_TALENT)
  async handleTalent(job: Job<RecomputeTalentJob>) {
    this.logger.log(`Recomputing recommendations for talent ${job.data.talentId}`);
    // Future: pre-compute and cache recommendations in Redis
  }

  @Process(RECOMMENDATION_JOBS.RECOMPUTE_FOR_CASTING)
  async handleCasting(job: Job<RecomputeCastingJob>) {
    this.logger.log(`Recomputing talent recommendations for casting ${job.data.castingId}`);
  }
}

// ─── Moderation Worker ────────────────────────────────────────────────────────

export interface AutoReviewJob { reportId: string; entityType: string; entityId: string; reason: string; }
export interface EscalateJob { reportId: string; }
export interface NotifyReporterJob { reportId: string; resolution: string; }

@Processor(QUEUES.MODERATION)
export class ModerationWorker {
  private readonly logger = new Logger(ModerationWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(MODERATION_JOBS.AUTO_REVIEW)
  async handleAutoReview(job: Job<AutoReviewJob>) {
    const { reportId, reason } = job.data;
    this.logger.log(`Auto-reviewing report ${reportId} [${reason}]`);
    // Child safety: immediately flag for human review, never auto-dismiss
    if (reason === 'child_safety') {
      await this.prisma.report.update({
        where: { id: reportId },
        data: { priority: 'critical' },
      });
    }
  }

  @Process(MODERATION_JOBS.ESCALATE)
  async handleEscalate(job: Job<EscalateJob>) {
    this.logger.log(`Escalating report ${job.data.reportId}`);
    // TODO: page on-call moderator via PagerDuty / Slack webhook
  }

  @Process(MODERATION_JOBS.NOTIFY_REPORTER)
  async handleNotifyReporter(job: Job<NotifyReporterJob>) {
    this.logger.log(`Notifying reporter for report ${job.data.reportId}`);
    // Queue email to reporter with resolution outcome
  }
}
