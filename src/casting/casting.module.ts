import { Module } from '@nestjs/common';
import { CastingService } from './casting.service';
import { CastingController } from './casting.controller';

@Module({
  providers: [CastingService],
  controllers: [CastingController],
  exports: [CastingService],
})
export class CastingModule {}
