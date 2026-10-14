import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { TalentApplicationsController } from './talent-applications.controller';
import { CastingApplicationsController } from './casting-applications.controller';

@Module({
  providers: [ApplicationsService],
  controllers: [
    ApplicationsController,
    TalentApplicationsController,
    CastingApplicationsController,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
