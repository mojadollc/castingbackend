import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SafetyService } from './safety.service';
import { AdminSafetyController } from './admin-safety.controller';
import { ReportsController } from './reports.controller';

@Module({
  providers: [AdminService, SafetyService],
  controllers: [AdminController, AdminSafetyController, ReportsController],
  exports: [SafetyService],
})
export class AdminModule {}
