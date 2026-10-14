import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/auth.guards';
import { UserRole } from '@prisma/client';

@ApiTags('Admin — Analytics')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('audit-logs')
  @ApiOperation({ summary: 'Query audit log with filters' })
  getAuditLogs(
    @Query('page') page = 1,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.svc.getAuditLogs(+page, action, userId, entityType);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Platform-wide analytics dashboard' })
  getAnalytics() {
    return this.svc.getPlatformAnalytics();
  }
}
