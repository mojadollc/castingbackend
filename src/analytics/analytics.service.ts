import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProjectStatus, ApplicationStatus, UserStatus } from '@prisma/client';

// Sensitive actions that must always be audited
export const AUDIT_ACTIONS = {
  ADMIN_USER_SUSPENDED: 'admin_user_suspended',
  ADMIN_USER_BANNED: 'admin_user_banned',
  PROFESSIONAL_VERIFIED: 'professional_verified',
  CASTING_APPROVED: 'casting_approved',
  CASTING_REJECTED: 'casting_rejected',
  APPLICATION_STATUS_CHANGED: 'application_status_changed',
  MESSAGE_REPORTED: 'message_reported',
  MEDIA_REMOVED: 'media_removed',
  REFUND_PROCESSED: 'refund_processed',
  SUBSCRIPTION_CHANGED: 'subscription_changed',
  REPORT_ESCALATED: 'report_escalated',
  APPEAL_REVIEWED: 'appeal_reviewed',
} as const;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Audit log ─────────────────────────────────────────────────────────────

  async getAuditLogs(page = 1, action?: string, userId?: string, entityType?: string) {
    const take = 50;
    const skip = (page - 1) * take;
    const where: any = {};
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;

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

  // ─── Platform analytics ────────────────────────────────────────────────────

  async getPlatformAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newUsersLast30, activeUsers,
      totalGuardians, totalProfessionals,
      totalTalents, totalCastings, publishedCastings,
      totalApplications, recentApplications,
      totalMessages, recentMessages,
      openReports, criticalReports,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      this.prisma.guardianProfile.count(),
      this.prisma.professionalProfile.count(),
      this.prisma.talentProfile.count(),
      this.prisma.castingProject.count(),
      this.prisma.castingProject.count({ where: { status: ProjectStatus.PUBLISHED } }),
      this.prisma.application.count(),
      this.prisma.application.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.message.count(),
      this.prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } } }),
      this.prisma.report.count({ where: { priority: 'critical', status: { not: 'RESOLVED' } } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Application status breakdown
    const appStatusBreakdown = await this.prisma.application.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Castings by status
    const castingStatusBreakdown = await this.prisma.castingProject.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Top casting categories
    const topCategories = await this.prisma.castingProject.groupBy({
      by: ['categoryId'],
      where: { categoryId: { not: null } },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 5,
    });

    // Recent audit events (sensitive actions)
    const recentAuditEvents = await this.prisma.auditLog.findMany({
      where: {
        action: { in: Object.values(AUDIT_ACTIONS) },
        createdAt: { gte: sevenDaysAgo },
      },
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      users: {
        total: totalUsers,
        newLast30Days: newUsersLast30,
        activeLast7Days: activeUsers,
        guardians: totalGuardians,
        professionals: totalProfessionals,
        talents: totalTalents,
      },
      castings: {
        total: totalCastings,
        published: publishedCastings,
        byStatus: castingStatusBreakdown.map((r) => ({ status: r.status, count: r._count.status })),
        topCategories,
      },
      applications: {
        total: totalApplications,
        last30Days: recentApplications,
        byStatus: appStatusBreakdown.map((r) => ({ status: r.status, count: r._count.status })),
      },
      messaging: {
        totalMessages,
        last7Days: recentMessages,
      },
      safety: {
        openReports,
        criticalReports,
      },
      subscriptions: {
        active: activeSubscriptions,
      },
      recentAuditEvents,
      generatedAt: now,
    };
  }
}
