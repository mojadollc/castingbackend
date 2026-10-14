import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../database/prisma.service';
import { S3Service } from './s3.service';
import { RequestUploadUrlDto, CompleteUploadDto, MAX_FILE_SIZES } from './media.dto';
import { MEDIA_QUEUE } from './processors/media.processor';
import { MediaType } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    @InjectQueue(MEDIA_QUEUE) private readonly mediaQueue: Queue,
  ) {}

  async requestUploadUrl(userId: string, dto: RequestUploadUrlDto) {
    const maxSize = MAX_FILE_SIZES[dto.contentType];
    if (dto.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds the ${Math.round(maxSize / 1024 / 1024)}MB limit for ${dto.contentType}`,
      );
    }

    const key = this.s3.buildKey(dto.contentType, dto.filename);
    const expiresIn = 900; // 15 minutes

    const uploadUrl = await this.s3.getPresignedUploadUrl(key, dto.contentType, expiresIn);

    const mediaFile = await this.prisma.mediaFile.create({
      data: {
        uploadedBy: userId,
        type: this.resolveMediaType(dto.contentType),
        status: 'PENDING',
        originalName: dto.filename,
        mimeType: dto.contentType,
        size: dto.size,
        url: key,
      },
    });

    await this.prisma.mediaProcessingJob.create({
      data: {
        mediaFileId: mediaFile.id,
        jobType: 'upload',
        status: 'pending',
      },
    });

    return {
      mediaId: mediaFile.id,
      uploadUrl,
      expiresIn,
      key,
    };
  }

  async completeUpload(userId: string, dto: CompleteUploadDto) {
    const media = await this.prisma.mediaFile.findUnique({ where: { id: dto.mediaId } });
    if (!media) throw new NotFoundException('Media not found');
    if (media.uploadedBy !== userId) throw new ForbiddenException();
    if (media.status !== 'PENDING') {
      throw new BadRequestException('Media is not in PENDING state');
    }

    // Enqueue background processing
    await this.mediaQueue.add(
      'process-media',
      {
        mediaId: media.id,
        key: media.url,
        contentType: media.mimeType,
        size: media.size,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );

    return { mediaId: media.id, status: 'PROCESSING', message: 'Media queued for processing' };
  }

  async getMedia(mediaId: string, userId: string) {
    const media = await this.prisma.mediaFile.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Media not found');
    if (media.uploadedBy !== userId) throw new ForbiddenException();

    // Generate a fresh signed URL if media is ready
    let signedUrl: string | null = null;
    if (media.status === 'READY' && media.url) {
      signedUrl = await this.s3.getPresignedDownloadUrl(media.url);
    }

    return { ...media, signedUrl };
  }

  async deleteMedia(mediaId: string, userId: string) {
    const media = await this.prisma.mediaFile.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Media not found');
    if (media.uploadedBy !== userId) throw new ForbiddenException();

    if (media.url) await this.s3.deleteObject(media.url);

    await this.prisma.mediaFile.delete({ where: { id: mediaId } });
    return { message: 'Media deleted' };
  }

  private resolveMediaType(contentType: string): MediaType {
    if (contentType.startsWith('image/')) return MediaType.PHOTO;
    if (contentType.startsWith('video/')) return MediaType.VIDEO;
    if (contentType.startsWith('audio/')) return MediaType.AUDIO;
    return MediaType.DOCUMENT;
  }
}
