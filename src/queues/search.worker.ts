import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES, SEARCH_JOBS } from './queue.constants';
import { PrismaService } from '../database/prisma.service';

export interface IndexCastingJob { castingId: string; }
export interface IndexTalentJob { talentId: string; }

@Processor(QUEUES.SEARCH)
export class SearchWorker {
  private readonly logger = new Logger(SearchWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(SEARCH_JOBS.INDEX_CASTING)
  async handleIndexCasting(job: Job<IndexCastingJob>) {
    this.logger.log(`Indexing casting ${job.data.castingId}`);
    // Phase 1: PostgreSQL full-text index update (automatic via Prisma)
    // Phase 2: Push to OpenSearch
    // await this.opensearch.index({ index: 'castings', id: castingId, body: doc })
  }

  @Process(SEARCH_JOBS.INDEX_TALENT)
  async handleIndexTalent(job: Job<IndexTalentJob>) {
    this.logger.log(`Indexing talent ${job.data.talentId}`);
    // Phase 2: Push to OpenSearch talent index
  }

  @Process(SEARCH_JOBS.REMOVE_CASTING)
  async handleRemoveCasting(job: Job<IndexCastingJob>) {
    this.logger.log(`Removing casting from index: ${job.data.castingId}`);
    // await this.opensearch.delete({ index: 'castings', id: castingId })
  }

  @Process(SEARCH_JOBS.REMOVE_TALENT)
  async handleRemoveTalent(job: Job<IndexTalentJob>) {
    this.logger.log(`Removing talent from index: ${job.data.talentId}`);
  }
}
