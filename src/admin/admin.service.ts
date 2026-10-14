import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserStatusDto, ModerationActionDto, RejectDto, RequestChangesDto } from './admin.dto';
import { ProjectStatus, UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Users ─────────────────────────────────────────────────────────────────

  async listUsers(page = 1, search?: string, status?: UserStatus) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, role: true, status: true,
          emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
          guardianProfile: { select: { firstName: true, lastName: true } },
          professionalProfile: { select: { firstName: true, lastName: true, isVerified: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        guardianProfile: { include: { talents: true } },
        professionalProfile: { include: { documents: true } },
        sessions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_STATUS_CHANGED',
        entityType: 'user',
        entityId: id,
        oldData: { status: user.status },
        newData: { status: dto.status, reason: dto.reason },
      },
    });

    return updated;
  }

  async forceLogout(id: string, adminId: string) {
    await this.prisma.userSession.deleteMany({ where: { userId: id } });
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_FORCE_LOGOUT',
        entityType: 'user',
        entityId: id,
      },
    });
    return { success: true };
  }

  // ─── Professionals ─────────────────────────────────────────────────────────

  async listProfessionals(page = 1, verified?: boolean) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = {};
    if (verified !== undefined) where.isVerified = verified;

    const [items, total] = await Promise.all([
      this.prisma.professionalProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, status: true } },
          documents: { select: { id: true, docType: true, verifiedAt: true } },
          _count: { select: { projects: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.professionalProfile.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }

  async getProfessional(id: string) {
    const prof = await this.prisma.professionalProfile.findUnique({
      where: { id },
      include: {
        user: true,
        documents: { include: { mediaFile: true } },
        projects: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  async verifyProfessional(id: string, adminId: string) {
    const prof = await this.prisma.professionalProfile.findUnique({ where: { id } });
    if (!prof) throw new NotFoundException('Professional not found');

    const updated = await this.prisma.professionalProfile.update({
      where: { id },
      data: { isVerified: true },
    });

    // Mark all documents as verified
    await this.prisma.professionalDocument.updateMany({
      where: { professionalId: id, verifiedAt: null },
      data: { verifiedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PROFESSIONAL_VERIFIED',
        entityType: 'professional',
        entityId: id,
      },
    });

    return updated;
  }

  async rejectProfessional(id: string, dto: RejectDto, adminId: string) {
    const prof = await this.prisma.professionalProfile.findUnique({ where: { id } });
    if (!prof) throw new NotFoundException('Professional not found');

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PROFESSIONAL_REJECTED',
        entityType: 'professional',
        entityId: id,
        newData: { reason: dto.reason },
      },
    });

    return { success: true, reason: dto.reason };
  }

  async suspendProfessional(id: string, dto: ModerationActionDto, adminId: string) {
    const prof = await this.prisma.professionalProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!prof) throw new NotFoundException('Professional not found');

    await this.prisma.user.update({
      where: { id: prof.userId },
      data: { status: UserStatus.SUSPENDED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PROFESSIONAL_SUSPENDED',
        entityType: 'professional',
        entityId: id,
        newData: { note: dto.note },
      },
    });

    return { success: true };
  }

  // ─── Casting Moderation ────────────────────────────────────────────────────

  async listModerationQueue(page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.castingProject.findMany({
        where: { status: ProjectStatus.PENDING_REVIEW },
        include: {
          professional: { select: { id: true, firstName: true, lastName: true, isVerified: true } },
          _count: { select: { roles: true } },
        },
        orderBy: { submittedAt: 'asc' },
        take,
        skip,
      }),
      this.prisma.castingProject.count({ where: { status: ProjectStatus.PENDING_REVIEW } }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }

  async getCasting(id: string) {
    const project = await this.prisma.castingProject.findUnique({
      where: { id },
      include: {
        professional: true,
        roles: true,
        _count: { select: { applications: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async approveCasting(id: string, adminId: string) {
    const project = await this.prisma.castingProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== ProjectStatus.PENDING_REVIEW) {
      throw new BadRequestException('Project is not pending review');
    }

    const updated = await this.prisma.castingProject.update({
      where: { id },
      data: { status: ProjectStatus.PUBLISHED, publishedAt: new Date(), moderationNote: null },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CASTING_APPROVED',
        entityType: 'casting_project',
        entityId: id,
      },
    });

    return updated;
  }

  async rejectCasting(id: string, dto: RejectDto, adminId: string) {
    const project = await this.prisma.castingProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const updated = await this.prisma.castingProject.update({
      where: { id },
      data: { status: ProjectStatus.DRAFT, moderationNote: dto.reason },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CASTING_REJECTED',
        entityType: 'casting_project',
        entityId: id,
        newData: { reason: dto.reason },
      },
    });

    return updated;
  }

  async requestCastingChanges(id: string, dto: RequestChangesDto, adminId: string) {
    const project = await this.prisma.castingProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const updated = await this.prisma.castingProject.update({
      where: { id },
      data: { status: ProjectStatus.DRAFT, moderationNote: dto.note },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CASTING_CHANGES_REQUESTED',
        entityType: 'casting_project',
        entityId: id,
        newData: { note: dto.note },
      },
    });

    return updated;
  }

  async unpublishCasting(id: string, dto: ModerationActionDto, adminId: string) {
    const project = await this.prisma.castingProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException('Project is not published');
    }

    const updated = await this.prisma.castingProject.update({
      where: { id },
      data: { status: ProjectStatus.PAUSED, moderationNote: dto.note },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CASTING_UNPUBLISHED',
        entityType: 'casting_project',
        entityId: id,
        newData: { note: dto.note },
      },
    });

    return updated;
  }
}
