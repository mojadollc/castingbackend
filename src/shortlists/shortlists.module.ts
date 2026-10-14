import { Module } from '@nestjs/common';
import { ShortlistsService } from './shortlists.service';
import { ShortlistsController } from './shortlists.controller';

@Module({
  providers: [ShortlistsService],
  controllers: [ShortlistsController],
  exports: [ShortlistsService],
})
export class ShortlistsModule {}
