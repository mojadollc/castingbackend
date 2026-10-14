import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES, IMAGE_JOBS } from './queue.constants';
import { PrismaService } from '../database/prisma.service';

export interface ImageJob {
  mediaId: string;
  key: string;
  contentType: string;
}

@Processor(QUEUES.IMAGE)
export class ImageWorker {
  private readonly logger = new Logger(ImageWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(IMAGE_JOBS.MALWARE_SCAN)
  async handleMalwareScan(job: Job<ImageJob>) {
    this.logger.log(`Malware scan image: ${job.data.key}`);
    // TODO: ClamAV / AWS Rekognition content moderation
    // Rekognition DetectModerationLabels — flag inappropriate content involving minors
  }

  @Process(IMAGE_JOBS.RESIZE)
  async handleResize(job: Job<ImageJob>) {
    this.logger.log(`Resizing image: ${job.data.key}`);
    // TODO: sharp — resize to [1200, 800, 400, 200] widths, save variants to S3
  }

  @Process(IMAGE_JOBS.OPTIMIZE)
  async handleOptimize(job: Job<ImageJob>) {
    this.logger.log(`Optimizing image: ${job.data.key}`);
    // TODO: sharp — convert to WebP, strip EXIF (privacy: remove GPS data from child photos)
    await this.prisma.mediaFile.update({
      where: { id: job.data.mediaId },
      data: { status: 'READY' },
    });
  }

  @Process(IMAGE_JOBS.THUMBNAIL)
  async handleThumbnail(job: Job<ImageJob>) {
    this.logger.log(`Generating thumbnail: ${job.data.key}`);
    // TODO: sharp — 200x200 crop center
  }
}
