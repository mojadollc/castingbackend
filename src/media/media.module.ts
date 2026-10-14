import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3Service } from './s3.service';
import { MediaProcessor, MEDIA_QUEUE } from './processors/media.processor';

@Module({
  imports: [
    // BullModule.forRoot is registered globally by QueuesModule
    BullModule.registerQueue({ name: MEDIA_QUEUE }),
  ],
  providers: [MediaService, S3Service, MediaProcessor],
  controllers: [MediaController],
  exports: [MediaService, S3Service],
})
export class MediaModule {}
