import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateAuditionDto, UpdateAuditionDto, SubmitSelfTapeDto, ScheduleCallbackDto,
} from './auditions.dto';
import { AuditionStatus, AuditionType, ApplicationStatus } from '@prisma/client';

@Injectable()
export class AuditionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getAuditionWithAccess(auditionId: string, userId: string) {
    const audition = await this.prisma.audition.findUnique({
      where: { id: auditionId },
      include: {
        application: {
          include: {
            project: { include: { professional: { select: { userId: true } } } },
            talent: { include: { guardian: { select: { userId: true } } } },
          },
        },
      },
    });
    if (!audition) throw new NotFoundException('Audition not found');

    const isProfessional = audition.application.project.professional?.userId === userId;
    const isGuardian = audition.application.talent.guardian.userId === userId;
    if (!isProfessional && !isGuardian) throw new ForbiddenException();

    return { audition, isProfessional, isGuardian };
  }

  private async assertProfessionalOwnsApplication(applicationId: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: { include: { professional: { select: { userId: true } } } },
        talent: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.project.professional?.userId !== userId) throw new ForbiddenException();
    return app;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateAuditionDto) {
    const app = await this.assertProfessionalOwnsApplication(dto.applicationId, userId);

    // Validate required fields per type
    if (dto.type === AuditionType.IN_PERSON && !dto.scheduledAt) {
      throw new BadRequestException('scheduledAt is required for IN_PERSON auditions');
    }
    if (dto.type === AuditionType.VIRTUAL && (!dto.scheduledAt || !dto.meetingUrl)) {
      throw new BadRequestException('scheduledAt and meetingUrl are required for VIRTUAL auditions');
    }
    if (dto.type === AuditionType.SELF_TAPE && !dto.selfTapeDueAt) {
      throw new BadRequestException('selfTapeDueAt is required for SELF_TAPE auditions');
    }

    const audition = await this.prisma.audition.create({
      data: {
        applicationId: dto.applicationId,
        talentId: app.talentId,
        type: dto.type,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        selfTapeDueAt: dto.selfTapeDueAt ? new Date(dto.selfTapeDueAt) : undefined,
        notes: dto.notes,
        status: AuditionStatus.SCHEDULED,
      },
      include: {
        talent: { select: { id: true, firstName: true, lastName: true } },
        application: { select: { id: true, projectId: true, roleId: true } },
      },
    });

    // Advance application status
    await this.prisma.application.update({
      where: { id: dto.applicationId },
      data: {
        status: ApplicationStatus.AUDITION_REQUESTED,
        statusHistory: { create: { status: ApplicationStatus.AUDITION_REQUESTED } },
      },
    });

    return audition;
  }

  async list(userId: string) {
    // Returns auditions for both professional (their projects) and guardian (their talents)
    const [professional, guardian] = await Promise.all([
      this.prisma.professionalProfile.findUnique({ where: { userId } }),
      this.prisma.guardianProfile.findUnique({ where: { userId } }),
    ]);

    if (professional) {
      return this.prisma.audition.findMany({
        where: { application: { project: { professionalId: professional.id } } },
        include: {
          talent: { select: { id: true, firstName: true, lastName: true, headshot: true } },
          application: { select: { id: true, projectId: true, roleId: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    }

    if (guardian) {
      const talents = await this.prisma.talentProfile.findMany({
        where: { guardianId: guardian.id },
        select: { id: true },
      });
      return this.prisma.audition.findMany({
        where: { talentId: { in: talents.map((t) => t.id) } },
        include: {
          application: {
            select: {
              id: true,
              project: { select: { id: true, title: true, location: true } },
              role: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    }

    return [];
  }

  async getOne(auditionId: string, userId: string) {
    const { audition } = await this.getAuditionWithAccess(auditionId, userId);
    return audition;
  }

  async update(auditionId: string, userId: string, dto: UpdateAuditionDto) {
    const { audition, isProfessional } = await this.getAuditionWithAccess(auditionId, userId);
    if (!isProfessional) throw new ForbiddenException('Only the professional can update audition details');

    if (audition.status === AuditionStatus.COMPLETED || audition.status === AuditionStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update a ${audition.status} audition`);
    }

    const data: any = { ...dto };
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.selfTapeDueAt) data.selfTapeDueAt = new Date(dto.selfTapeDueAt);

    return this.prisma.audition.update({ where: { id: auditionId }, data });
  }

  // ─── Lifecycle actions ─────────────────────────────────────────────────────

  async submitSelfTape(auditionId: string, userId: string, dto: SubmitSelfTapeDto) {
    const { audition, isGuardian } = await this.getAuditionWithAccess(auditionId, userId);
    if (!isGuardian) throw new ForbiddenException('Only the guardian can submit a self-tape');
    if (audition.type !== AuditionType.SELF_TAPE) {
      throw new BadRequestException('This audition is not a self-tape type');
    }
    if (audition.status !== AuditionStatus.SCHEDULED) {
      throw new BadRequestException('Self-tape already submitted');
    }

    return this.prisma.audition.update({
      where: { id: auditionId },
      data: { selfTapeUrl: dto.selfTapeUrl, status: AuditionStatus.CONFIRMED },
    });
  }

  async scheduleCallback(auditionId: string, userId: string, dto: ScheduleCallbackDto) {
    const { audition, isProfessional } = await this.getAuditionWithAccess(auditionId, userId);
    if (!isProfessional) throw new ForbiddenException();
    if (audition.status !== AuditionStatus.COMPLETED) {
      throw new BadRequestException('Can only schedule a callback after audition is completed');
    }

    // Create a new CALLBACK audition linked to the same application
    const callback = await this.prisma.audition.create({
      data: {
        applicationId: audition.applicationId,
        talentId: audition.talentId,
        type: AuditionType.CALLBACK,
        callbackAt: new Date(dto.callbackAt),
        scheduledAt: new Date(dto.callbackAt),
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        notes: dto.notes,
        status: AuditionStatus.SCHEDULED,
      },
    });

    // Advance application status
    await this.prisma.application.update({
      where: { id: audition.applicationId },
      data: {
        status: ApplicationStatus.CALLBACK,
        statusHistory: { create: { status: ApplicationStatus.CALLBACK } },
      },
    });

    return callback;
  }

  async complete(auditionId: string, userId: string, feedback?: string) {
    const { audition, isProfessional } = await this.getAuditionWithAccess(auditionId, userId);
    if (!isProfessional) throw new ForbiddenException();

    const completable: AuditionStatus[] = [AuditionStatus.SCHEDULED, AuditionStatus.CONFIRMED];
    if (!completable.includes(audition.status)) {
      throw new BadRequestException(`Cannot complete an audition in ${audition.status} status`);
    }

    return this.prisma.audition.update({
      where: { id: auditionId },
      data: { status: AuditionStatus.COMPLETED, feedback },
    });
  }
}
