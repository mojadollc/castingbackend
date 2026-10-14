import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.bucket = config.get<string>('AWS_S3_BUCKET', '');
    this.cdnUrl = config.get('AWS_CLOUDFRONT_URL', '');
  }

  buildKey(contentType: string, originalName: string): string {
    const ext = path.extname(originalName) || this.extFromMime(contentType);
    const folder = this.folderFromMime(contentType);
    return `${folder}/${uuid()}${ext}`;
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.error(`Failed to delete S3 object ${key}`, err);
    }
  }

  buildCdnUrl(key: string): string {
    return this.cdnUrl ? `${this.cdnUrl}/${key}` : `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  private folderFromMime(contentType: string): string {
    if (contentType.startsWith('image/')) return 'images';
    if (contentType.startsWith('video/')) return 'videos';
    if (contentType.startsWith('audio/')) return 'audio';
    return 'documents';
  }

  private extFromMime(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/mp4': '.m4a',
      'application/pdf': '.pdf',
    };
    return map[contentType] || '';
  }
}
