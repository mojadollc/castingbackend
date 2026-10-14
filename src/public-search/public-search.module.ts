import { Module } from '@nestjs/common';
import { PublicSearchService } from './public-search.service';
import { PublicSearchController } from './public-search.controller';

@Module({
  providers: [PublicSearchService],
  controllers: [PublicSearchController],
})
export class PublicSearchModule {}
