import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateReportDto, AddEvidenceDto, AssignReportDto, ResolveReportDto,
  EscalateReportDto, EnforceUserDto, CreateAppealDto, ReviewAppealDto,
} from './safety.dto';
import { ReportStatus, UserStatus, AppealStatus } from '@prisma/client';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Audit helper ──────────────────────────────────────────────────────────

  private audit(adminId: string, action: string, entityType: string, entityId: string, data?: any) {
    return this.prisma.auditLog.create({
      data: { userId: adminId, action, entityType, entityId, newData: data },
    });
  }

  // ─── Public: Submit report ─────────────────────────────────────────────────

  async createReport(userId: string, dto: CreateReportDto) {
    // Fraud detection: flag users who submit many reports in a short window
    const recentCount = await this.prisma.report.count({
      where: {
        reportedById: userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    const priority = dto.reason === 'child_safety' ? 'critical'
      : dto.reason === 'fraud' ? 'high'
      : dto.reason === 'harassment' ? 'high'
      : 'normal';

    const report = await this.prisma.report.create({
      data: {
        reportedById: userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        reason: dto.reason,
        description: dto.description,
        priority,
        status: ReportStatus.OPEN,
      },
    });

    // Auto-escalate child safety reports immediately
    if (dto.reason === 'child_safety') {
      await this.prisma.safetyCase.create({
        data: {
          reportId: report.id,
          severity: 'critical',
          notes: 'Auto-escalated: child safety report',
        },
      });
      await this.prisma.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.ESCALATED },
      });
    }

    // Flag potential fraud reporters (>10 reports/day)
    if (recentCount >= 10) {
      await this.audit('system', 'FRAUD_REPORTER_FLAGGED', 'user', userId, {
        reportCount: recentCount + 1,
      });
    }

    return report;
  }

  async addEvidence(reportId: string, userId: string, dto: AddEvidenceDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.reportedById !== userId) throw new ForbiddenException();

    return this.prisma.reportEvidence.create({
      data: { reportId, type: dto.type, content: dto.content, uploadedBy: userId },
    });
  }

  // ─── Admin: Report management ──────────────────────────────────────────────

  async listReports(page = 1, status?: ReportStatus, priority?: string, entityType?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (entityType) where.entityType = entityType;

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reportedBy: { select: { id: true, email: true, role: true } },
          safetyCase: true,
          _count: { select: { evidence: true, actions: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take,
        skip,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }

  async getReport(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { id: true, email: true, role: true } },
        safetyCase: true,
        evidence: true,
        actions: true,
        appeal: true,
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async assignReport(id: string, dto: AssignReportDto, adminId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        assignedToId: dto.moderatorId,
        status: ReportStatus.UNDER_REVIEW,
      },
    });

    await this.audit(adminId, 'REPORT_ASSIGNED', 'report', id, { moderatorId: dto.moderatorId });
    return updated;
  }

  async resolveReport(id: string, dto: ResolveReportDto, adminId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === ReportStatus.RESOLVED) {
      throw new BadRequestException('Report already resolved');
    }

    // Apply enforcement action if specified
    if (dto.enforcement && dto.enforcement !== 'no_action' && dto.targetUserId) {
      await this.applyEnforcement(dto.enforcement, dto.targetUserId, id, adminId, dto.note);
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: ReportStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: adminId,
      },
    });

    await this.prisma.moderationAction.create({
      data: {
        reportId: id,
        action: dto.enforcement ?? 'no_action',
        note: dto.note,
        performedBy: adminId,
        targetUserId: dto.targetUserId,
      },
    });

    await this.audit(adminId, 'REPORT_RESOLVED', 'report', id, {
      enforcement: dto.enforcement,
      note: dto.note,
    });

    return updated;
  }

  async escalateReport(id: string, dto: EscalateReportDto, adminId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { safetyCase: true },
    });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.report.update({
      where: { id },
      data: { status: ReportStatus.ESCALATED, priority: 'critical' },
    });

    if (report.safetyCase) {
      await this.prisma.safetyCase.update({
        where: { reportId: id },
        data: { severity: dto.severity, notes: dto.notes, assignedToId: adminId },
      });
    } else {
      await this.prisma.safetyCase.create({
        data: {
          reportId: id,
          severity: dto.severity,
          notes: dto.notes,
          assignedToId: adminId,
        },
      });
    }

    await this.audit(adminId, 'REPORT_ESCALATED', 'report', id, { severity: dto.severity });
    return this.getReport(id);
  }

  // ─── Enforcement ───────────────────────────────────────────────────────────

  private async applyEnforcement(
    action: string,
    targetUserId: string,
    reportId: string,
    adminId: string,
    note?: string,
  ) {
    const statusMap: Record<string, UserStatus> = {
      suspend: UserStatus.SUSPENDED,
      ban: UserStatus.BANNED,
    };

    if (statusMap[action]) {
      await this.prisma.user.update({
        where: { id: targetUserId },
        data: { status: statusMap[action] },
      });
      // Terminate all sessions on suspend/ban
      await this.prisma.userSession.deleteMany({ where: { userId: targetUserId } });
    }

    await this.audit(adminId, `USER_${action.toUpperCase()}`, 'user', targetUserId, {
      reportId,
      note,
    });
  }

  async suspendUser(userId: string, dto: EnforceUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.BANNED) throw new BadRequestException('User is already banned');

    await this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.SUSPENDED } });
    await this.prisma.userSession.deleteMany({ where: { userId } });
    await this.audit(adminId, 'USER_SUSPENDED', 'user', userId, { reason: dto.reason });
    return { success: true };
  }

  async banUser(userId: string, dto: EnforceUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.BANNED } });
    await this.prisma.userSession.deleteMany({ where: { userId } });
    await this.audit(adminId, 'USER_BANNED', 'user', userId, { reason: dto.reason });
    return { success: true };
  }

  // ─── Appeals ───────────────────────────────────────────────────────────────

  async createAppeal(userId: string, dto: CreateAppealDto) {
    const report = await this.prisma.report.findUnique({ where: { id: dto.reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const existing = await this.prisma.appeal.findUnique({ where: { reportId: dto.reportId } });
    if (existing) throw new BadRequestException('An appeal already exists for this report');

    return this.prisma.appeal.create({
      data: {
        reportId: dto.reportId,
        userId,
        reason: dto.reason,
        status: AppealStatus.PENDING,
      },
    });
  }

  async listAppeals(page = 1, status?: AppealStatus) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.appeal.findMany({
        where,
        include: {
          report: { select: { id: true, reason: true, entityType: true, status: true } },
        },
        orderBy: { createdAt: 'asc' },
        take,
        skip,
      }),
      this.prisma.appeal.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }

  async reviewAppeal(id: string, dto: ReviewAppealDto, adminId: string) {
    const appeal = await this.prisma.appeal.findUnique({ where: { id } });
    if (!appeal) throw new NotFoundException('Appeal not found');
    if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.UNDER_REVIEW) {
      throw new BadRequestException('Appeal already reviewed');
    }

    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // If upheld, reopen the report for re-review
    if (dto.status === AppealStatus.UPHELD) {
      await this.prisma.report.update({
        where: { id: appeal.reportId },
        data: { status: ReportStatus.UNDER_REVIEW, resolvedAt: null },
      });
    }

    await this.audit(adminId, 'APPEAL_REVIEWED', 'appeal', id, { status: dto.status });
    return updated;
  }

  // ─── Audit trail ───────────────────────────────────────────────────────────

  async getAuditTrail(entityType: string, entityId: string, page = 1) {
    const take = 50;
    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType, entityId },
        include: { user: { select: { id: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.auditLog.count({ where: { entityType, entityId } }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }

  async getFullAuditLog(page = 1, action?: string) {
    const take = 50;
    const skip = (page - 1) * take;
    const where: any = {};
    if (action) where.action = { contains: action, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }
}
