import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SafetyService } from './safety.service';
import {
  AssignReportDto, ResolveReportDto, EscalateReportDto,
  EnforceUserDto, ReviewAppealDto,
} from './safety.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../auth/auth.guards';
import { UserRole, ReportStatus, AppealStatus } from '@prisma/client';

@ApiTags('Admin — Safety')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
@Controller('admin')
export class AdminSafetyController {
  constructor(private readonly safety: SafetyService) {}

  // ─── Reports ───────────────────────────────────────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'List all reports (moderation queue)' })
  listReports(
    @Query('page') page = 1,
    @Query('status') status?: ReportStatus,
    @Query('priority') priority?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.safety.listReports(+page, status, priority, entityType);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get report with evidence, actions, safety case' })
  getReport(@Param('id') id: string) {
    return this.safety.getReport(id);
  }

  @Post('reports/:id/assign')
  @ApiOperation({ summary: 'Assign report to a moderator' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignReportDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.safety.assignReport(id, dto, adminId);
  }

  @Post('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve report with optional enforcement action' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.safety.resolveReport(id, dto, adminId);
  }

  @Post('reports/:id/escalate')
  @ApiOperation({ summary: 'Escalate report to safety case' })
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateReportDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.safety.escalateReport(id, dto, adminId);
  }

  // ─── Enforcement ───────────────────────────────────────────────────────────

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user' })
  suspend(
    @Param('id') id: string,
    @Body() dto: EnforceUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.safety.suspendUser(id, dto, adminId);
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: 'Permanently ban a user' })
  ban(
    @Param('id') id: string,
    @Body() dto: EnforceUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.safety.banUser(id, dto, adminId);
  }

  // ─── Appeals ───────────────────────────────────────────────────────────────

  @Get('appeals')
  @ApiOperation({ summary: 'List appeals' })
  listAppeals(@Query('page') page = 1, @Query('status') status?: AppealStatus) {
    return this.safety.listAppeals(+page, status);
  }

  @Post('appeals/:id/review')
  @ApiOperation({ summary: 'Review an appeal (uphold or reject)' })
  reviewAppeal(
    @Param('id') id: string,
    @Body() dto: ReviewAppealDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.safety.reviewAppeal(id, dto, adminId);
  }

  // ─── Audit trail ───────────────────────────────────────────────────────────

  @Get('audit-log')
  @ApiOperation({ summary: 'Full audit log' })
  auditLog(@Query('page') page = 1, @Query('action') action?: string) {
    return this.safety.getFullAuditLog(+page, action);
  }

  @Get('audit-log/:entityType/:entityId')
  @ApiOperation({ summary: 'Audit trail for a specific entity' })
  entityAudit(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('page') page = 1,
  ) {
    return this.safety.getAuditTrail(entityType, entityId, +page);
  }
}
