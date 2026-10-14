import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../s3.service';

export const MEDIA_QUEUE = 'media-processing';

export interface MediaProcessingJob {
  mediaId: string;
  key: string;
  contentType: string;
  size: number;
}

@Processor(MEDIA_QUEUE)
export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Process('process-media')
  async handleMediaProcessing(job: Job<MediaProcessingJob>) {
    const { mediaId, key, contentType, size } = job.data;
    this.logger.log(`Processing media ${mediaId}`);

    try {
      await this.updateStatus(mediaId, 'PROCESSING');

      // Step 1: Validate size limits (already checked at upload-url request, double-check here)
      await this.validateFile(mediaId, contentType, size);

      // Step 2: Determine media type and build metadata
      const metadata = await this.buildMetadata(contentType, key, size);

      // Step 3: Generate CDN URL
      const cdnUrl = this.s3.buildCdnUrl(key);

      // Step 4: Mark READY with metadata
      await this.prisma.mediaFile.update({
        where: { id: mediaId },
        data: {
          status: 'READY',
          url: key,
          cdnUrl,
          metadata,
        },
      });

      // Step 5: Log processing job result
      await this.prisma.mediaProcessingJob.updateMany({
        where: { mediaFileId: mediaId, status: 'pending' },
        data: { status: 'completed', result: { processedAt: new Date().toISOString() } },
      });

      this.logger.log(`Media ${mediaId} marked READY`);
    } catch (err) {
      this.logger.error(`Media processing failed for ${mediaId}`, err);
      await this.updateStatus(mediaId, 'FAILED');
      await this.prisma.mediaProcessingJob.updateMany({
        where: { mediaFileId: mediaId, status: 'pending' },
        data: { status: 'failed', result: { error: err.message } },
      });
      throw err;
    }
  }

  private async validateFile(mediaId: string, contentType: string, size: number) {
    const MAX_SIZES: Record<string, number> = {
      'image/': 10 * 1024 * 1024,
      'video/': 500 * 1024 * 1024,
      'audio/': 50 * 1024 * 1024,
      'application/pdf': 20 * 1024 * 1024,
    };

    for (const [prefix, max] of Object.entries(MAX_SIZES)) {
      if (contentType.startsWith(prefix) && size > max) {
        throw new Error(`File size ${size} exceeds limit for ${contentType}`);
      }
    }
  }

  private async buildMetadata(contentType: string, key: string, size: number) {
    const base = { size, key, processedAt: new Date().toISOString() };

    if (contentType.startsWith('image/')) {
      // In production: use sharp to get dimensions, generate thumbnail
      return { ...base, type: 'image', thumbnailKey: null };
    }

    if (contentType.startsWith('video/')) {
      // In production: use ffmpeg to transcode, extract thumbnail, get duration
      return { ...base, type: 'video', thumbnailKey: null, duration: null };
    }

    if (contentType.startsWith('audio/')) {
      // In production: use ffmpeg to get duration, waveform
      return { ...base, type: 'audio', duration: null };
    }

    return { ...base, type: 'document' };
  }

  private async updateStatus(mediaId: string, status: string) {
    await this.prisma.mediaFile.update({
      where: { id: mediaId },
      data: { status: status as any },
    });
  }
}
