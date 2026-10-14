import { Module } from '@nestjs/common';
import { AuditionsService } from './auditions.service';
import { AuditionsController } from './auditions.controller';

@Module({
  providers: [AuditionsService],
  controllers: [AuditionsController],
  exports: [AuditionsService],
})
export class AuditionsModule {}
