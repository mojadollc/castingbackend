import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateGuardianProfileDto, CreateTalentDto, UpdateTalentDto } from './guardians.dto';
import { Gender } from '@prisma/client';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.guardianProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Guardian profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateGuardianProfileDto) {
    return this.prisma.guardianProfile.update({ where: { userId }, data: dto });
  }

  async getDashboard(userId: string) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: { talents: { select: { id: true, firstName: true, lastName: true, headshot: true, profileCompletion: true } } },
    });
    if (!guardian) throw new NotFoundException('Guardian profile not found');

    const talentIds = guardian.talents.map((t) => t.id);

    const [applications, auditions, notifications, subscription] = await Promise.all([
      this.prisma.application.findMany({
        where: { talentId: { in: talentIds } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { id: true, title: true } } },
      }),
      this.prisma.audition.findMany({
        where: { talentId: { in: talentIds }, status: 'SCHEDULED' },
        take: 5,
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.notification.findMany({
        where: { userId, readAt: null },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { plan: true },
      }),
    ]);

    const profileCompletion = guardian.talents.length
      ? Math.round(
          guardian.talents.reduce((sum, t) => sum + t.profileCompletion, 0) /
            guardian.talents.length,
        )
      : 0;

    return {
      talents: guardian.talents,
      profileCompletion,
      applications,
      auditions,
      notifications,
      subscription,
    };
  }

  async getTalents(userId: string) {
    const guardian = await this.getProfile(userId);
    return this.prisma.talentProfile.findMany({
      where: { guardianId: guardian.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTalent(userId: string, dto: CreateTalentDto) {
    const guardian = await this.getProfile(userId);
    return this.prisma.talentProfile.create({
      data: {
        guardianId: guardian.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender as Gender,
        bio: dto.bio,
      },
    });
  }

  async getTalent(userId: string, talentId: string) {
    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: { guardian: true },
    });
    if (!talent) throw new NotFoundException('Talent not found');
    if (talent.guardian.userId !== userId) throw new ForbiddenException();
    return talent;
  }

  async updateTalent(userId: string, talentId: string, dto: UpdateTalentDto) {
    await this.getTalent(userId, talentId);
    const data: any = { ...dto };
    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);
    return this.prisma.talentProfile.update({ where: { id: talentId }, data });
  }

  async deleteTalent(userId: string, talentId: string) {
    await this.getTalent(userId, talentId);
    await this.prisma.talentProfile.delete({ where: { id: talentId } });
    return { message: 'Talent profile deleted' };
  }
}
