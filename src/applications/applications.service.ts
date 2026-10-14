import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  SubmitApplicationDto, ListApplicationsQueryDto, UpdateApplicationStatusDto,
  AddNoteDto, AddTagsDto, BulkStatusDto, BulkTagDto, BulkMessageDto,
} from './applications.dto';
import { ApplicationStatus, ProjectStatus, UserRole } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Phase 11: Guardian / Talent side ─────────────────────────────────────

  async submit(userId: string, dto: SubmitApplicationDto) {
    // Verify guardian owns the talent
    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: dto.talentId },
      include: { guardian: { select: { userId: true } } },
    });
    if (!talent) throw new NotFoundException('Talent not found');
    if (talent.guardian.userId !== userId) throw new ForbiddenException();

    // Verify project is published and accepting applications
    const project = await this.prisma.castingProject.findUnique({
      where: { id: dto.projectId },
      include: { roles: true },
    });
    if (!project) throw new NotFoundException('Casting project not found');
    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException('This casting is not accepting applications');
    }
    if (project.applicationEnd && dayjs().isAfter(project.applicationEnd)) {
      throw new BadRequestException('Application deadline has passed');
    }

    // Verify role belongs to project if provided
    if (dto.roleId) {
      const role = project.roles.find((r) => r.id === dto.roleId);
      if (!role) throw new NotFoundException('Role not found in this project');
      if (role.isFilled) throw new BadRequestException('This role is already filled');
    }

    // Eligibility: age check against role
    if (dto.roleId) {
      const role = project.roles.find((r) => r.id === dto.roleId);
      if (role) {
        const ageYears = dayjs().diff(dayjs(talent.dateOfBirth), 'year');
        if (role.ageMin && ageYears < role.ageMin) {
          throw new BadRequestException(`Talent must be at least ${role.ageMin} years old for this role`);
        }
        if (role.ageMax && ageYears > role.ageMax) {
          throw new BadRequestException(`Talent must be at most ${role.ageMax} years old for this role`);
        }
      }
    }

    // Duplicate prevention
    const existing = await this.prisma.application.findFirst({
      where: { talentId: dto.talentId, projectId: dto.projectId, roleId: dto.roleId ?? null },
    });
    if (existing) throw new ConflictException('Application already submitted for this role');

    // Create application with answers and assets in a transaction
    const application = await this.prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          talentId: dto.talentId,
          projectId: dto.projectId,
          roleId: dto.roleId,
          coverNote: dto.coverNote,
          status: ApplicationStatus.SUBMITTED,
          answers: dto.answers?.length
            ? { createMany: { data: dto.answers } }
            : undefined,
          assets: dto.assetIds?.length
            ? { createMany: { data: dto.assetIds.map((id) => ({ mediaFileId: id })) } }
            : undefined,
          statusHistory: {
            create: { status: ApplicationStatus.SUBMITTED },
          },
        },
        include: {
          answers: true,
          assets: { include: { mediaFile: true } },
          talent: { select: { id: true, firstName: true, lastName: true, headshot: true } },
          project: { select: { id: true, title: true } },
          role: { select: { id: true, name: true } },
        },
      });
      return app;
    });

    return application;
  }

  async listForGuardian(userId: string, query: ListApplicationsQueryDto) {
    const guardian = await this.prisma.guardianProfile.findUnique({ where: { userId } });
    if (!guardian) throw new NotFoundException('Guardian profile not found');

    const talents = await this.prisma.talentProfile.findMany({
      where: { guardianId: guardian.id },
      select: { id: true },
    });
    const talentIds = talents.map((t) => t.id);

    const { page = 1, limit = 20, status } = query;
    const where: any = { talentId: { in: talentIds } };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          talent: { select: { id: true, firstName: true, lastName: true, headshot: true } },
          project: { select: { id: true, title: true, location: true, auditionMethod: true } },
          role: { select: { id: true, name: true } },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOne(applicationId: string, userId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        talent: { include: { guardian: { select: { userId: true } } } },
        project: { include: { professional: { select: { userId: true } } } },
        role: true,
        answers: true,
        assets: { include: { mediaFile: true } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        auditions: true,
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const isGuardian = application.talent.guardian.userId === userId;
    const isProfessional = application.project.professional?.userId === userId;
    if (!isGuardian && !isProfessional) throw new ForbiddenException();

    // Mark as VIEWED if professional is reading it for the first time
    if (isProfessional && application.status === ApplicationStatus.SUBMITTED) {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.VIEWED, viewedAt: new Date() },
      });
      application.status = ApplicationStatus.VIEWED;
    }

    return application;
  }

  async withdraw(applicationId: string, userId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { talent: { include: { guardian: { select: { userId: true } } } } },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.talent.guardian.userId !== userId) throw new ForbiddenException();

    const terminal: ApplicationStatus[] = [ApplicationStatus.WITHDRAWN, ApplicationStatus.CLOSED];
    if (terminal.includes(application.status)) {
      throw new BadRequestException('Application cannot be withdrawn');
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.WITHDRAWN,
        statusHistory: { create: { status: ApplicationStatus.WITHDRAWN } },
      },
    });
  }

  async listForTalent(talentId: string, userId: string, query: ListApplicationsQueryDto) {
    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: { guardian: { select: { userId: true } } },
    });
    if (!talent) throw new NotFoundException('Talent not found');
    if (talent.guardian.userId !== userId) throw new ForbiddenException();

    const { page = 1, limit = 20, status } = query;
    const where: any = { talentId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, title: true, location: true } },
          role: { select: { id: true, name: true } },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listForCasting(castingId: string, userId: string, query: ListApplicationsQueryDto) {
    await this.assertProfessionalOwns(castingId, userId);
    const { page = 1, limit = 20, status } = query;
    const where: any = { projectId: castingId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          talent: {
            select: { id: true, firstName: true, lastName: true, headshot: true,
              dateOfBirth: true, gender: true, profileCompletion: true },
          },
          role: { select: { id: true, name: true } },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listForRole(roleId: string, userId: string, query: ListApplicationsQueryDto) {
    const role = await this.prisma.castingRole.findUnique({
      where: { id: roleId },
      include: { project: { include: { professional: { select: { userId: true } } } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.project.professional?.userId !== userId) throw new ForbiddenException();

    const { page = 1, limit = 20, status } = query;
    const where: any = { roleId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          talent: {
            select: { id: true, firstName: true, lastName: true, headshot: true,
              dateOfBirth: true, gender: true },
          },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Phase 12: Professional side ──────────────────────────────────────────

  async updateStatus(applicationId: string, userId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.assertProfessionalOwnsApplication(applicationId, userId);

    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Cannot update a withdrawn application');
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        statusHistory: { create: { status: dto.status, note: dto.note } },
      },
    });
  }

  async addNote(applicationId: string, userId: string, dto: AddNoteDto) {
    await this.assertProfessionalOwnsApplication(applicationId, userId);
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { notes: dto.note },
    });
  }

  async addTags(applicationId: string, userId: string, dto: AddTagsDto) {
    await this.assertProfessionalOwnsApplication(applicationId, userId);
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    const merged = [...new Set([...(app.tags ?? []), ...dto.tags])];
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { tags: merged },
    });
  }

  async bulkUpdateStatus(userId: string, dto: BulkStatusDto) {
    await this.assertProfessionalOwnsApplications(dto.applicationIds, userId);
    await this.prisma.application.updateMany({
      where: { id: { in: dto.applicationIds } },
      data: { status: dto.status },
    });
    if (dto.note) {
      await this.prisma.applicationStatusHistory.createMany({
        data: dto.applicationIds.map((id) => ({
          applicationId: id,
          status: dto.status,
          note: dto.note,
        })),
      });
    }
    return { updated: dto.applicationIds.length };
  }

  async bulkTag(userId: string, dto: BulkTagDto) {
    await this.assertProfessionalOwnsApplications(dto.applicationIds, userId);
    const apps = await this.prisma.application.findMany({
      where: { id: { in: dto.applicationIds } },
      select: { id: true, tags: true },
    });
    await Promise.all(
      apps.map((app) =>
        this.prisma.application.update({
          where: { id: app.id },
          data: { tags: [...new Set([...(app.tags ?? []), ...dto.tags])] },
        }),
      ),
    );
    return { updated: dto.applicationIds.length };
  }

  async bulkMessage(userId: string, dto: BulkMessageDto) {
    // Verify ownership then create conversations/messages
    await this.assertProfessionalOwnsApplications(dto.applicationIds, userId);

    const professional = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    const applications = await this.prisma.application.findMany({
      where: { id: { in: dto.applicationIds } },
      include: { talent: { include: { guardian: { select: { userId: true } } } } },
    });

    const results = await Promise.all(
      applications.map(async (app) => {
        const guardianUserId = app.talent.guardian.userId;
        // Find or create conversation between professional and guardian
        let convo = await this.prisma.conversation.findFirst({
          where: {
            members: {
              every: { userId: { in: [userId, guardianUserId] } },
            },
          },
        });
        if (!convo) {
          convo = await this.prisma.conversation.create({
            data: {
              members: {
                createMany: {
                  data: [{ userId }, { userId: guardianUserId }],
                },
              },
            },
          });
        }
        await this.prisma.message.create({
          data: { conversationId: convo.id, senderId: userId, body: dto.message },
        });
        return convo.id;
      }),
    );

    return { sent: results.length, conversationIds: results };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertProfessionalOwns(castingId: string, userId: string) {
    const project = await this.prisma.castingProject.findUnique({
      where: { id: castingId },
      include: { professional: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Casting project not found');
    if (project.professional?.userId !== userId) throw new ForbiddenException();
    return project;
  }

  private async assertProfessionalOwnsApplication(applicationId: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { project: { include: { professional: { select: { userId: true } } } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.project.professional?.userId !== userId) throw new ForbiddenException();
    return app;
  }

  private async assertProfessionalOwnsApplications(applicationIds: string[], userId: string) {
    const apps = await this.prisma.application.findMany({
      where: { id: { in: applicationIds } },
      include: { project: { include: { professional: { select: { userId: true } } } } },
    });
    const unauthorized = apps.filter((a) => a.project.professional?.userId !== userId);
    if (unauthorized.length > 0) throw new ForbiddenException('One or more applications do not belong to you');
  }
}
