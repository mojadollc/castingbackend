import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateShortlistDto, AddTalentToShortlistDto, ShortlistMessageDto } from './shortlists.dto';

const TALENT_SELECT = {
  id: true, firstName: true, lastName: true, headshot: true,
  dateOfBirth: true, gender: true, height: true, weight: true,
  eyeColor: true, hairColor: true, profileCompletion: true,
  photos: { where: { isPrimary: true }, include: { mediaFile: true }, take: 1 },
  skills: { include: { skill: true } },
  credits: { orderBy: { year: 'desc' as const }, take: 3 },
};

@Injectable()
export class ShortlistsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectOwner(projectId: string, userId: string) {
    const project = await this.prisma.castingProject.findUnique({
      where: { id: projectId },
      include: { professional: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.professional?.userId !== userId) throw new ForbiddenException();
    return project;
  }

  private async assertShortlistOwner(shortlistId: string, userId: string) {
    const shortlist = await this.prisma.shortlist.findUnique({
      where: { id: shortlistId },
      include: { project: { include: { professional: { select: { userId: true } } } } },
    });
    if (!shortlist) throw new NotFoundException('Shortlist not found');
    if (shortlist.project.professional?.userId !== userId) throw new ForbiddenException();
    return shortlist;
  }

  async create(projectId: string, userId: string, dto: CreateShortlistDto) {
    await this.assertProjectOwner(projectId, userId);
    return this.prisma.shortlist.create({
      data: { projectId, name: dto.name, description: dto.description, createdBy: userId },
      include: { _count: { select: { talents: true } } },
    });
  }

  async listForProject(projectId: string, userId: string) {
    await this.assertProjectOwner(projectId, userId);
    return this.prisma.shortlist.findMany({
      where: { projectId },
      include: {
        _count: { select: { talents: true } },
        talents: {
          take: 4,
          include: { talent: { select: { id: true, firstName: true, lastName: true, headshot: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addTalent(shortlistId: string, userId: string, dto: AddTalentToShortlistDto) {
    await this.assertShortlistOwner(shortlistId, userId);

    const exists = await this.prisma.shortlistTalent.findUnique({
      where: { shortlistId_talentId: { shortlistId, talentId: dto.talentId } },
    });
    if (exists) throw new ConflictException('Talent already in this shortlist');

    return this.prisma.shortlistTalent.create({
      data: {
        shortlistId,
        talentId: dto.talentId,
        applicationId: dto.applicationId,
        note: dto.note,
      },
      include: { talent: { select: TALENT_SELECT } },
    });
  }

  async removeTalent(shortlistId: string, talentId: string, userId: string) {
    await this.assertShortlistOwner(shortlistId, userId);
    const entry = await this.prisma.shortlistTalent.findUnique({
      where: { shortlistId_talentId: { shortlistId, talentId } },
    });
    if (!entry) throw new NotFoundException('Talent not in this shortlist');
    await this.prisma.shortlistTalent.delete({
      where: { shortlistId_talentId: { shortlistId, talentId } },
    });
    return { message: 'Talent removed from shortlist' };
  }

  async sendMessage(shortlistId: string, userId: string, dto: ShortlistMessageDto) {
    const shortlist = await this.assertShortlistOwner(shortlistId, userId);

    const entries = await this.prisma.shortlistTalent.findMany({
      where: { shortlistId },
      include: { talent: { include: { guardian: { select: { userId: true } } } } },
    });

    const results = await Promise.all(
      entries.map(async (entry) => {
        const guardianUserId = entry.talent.guardian.userId;
        let convo = await this.prisma.conversation.findFirst({
          where: {
            AND: [
              { members: { some: { userId } } },
              { members: { some: { userId: guardianUserId } } },
            ],
          },
        });
        if (!convo) {
          convo = await this.prisma.conversation.create({
            data: {
              subject: shortlist.name,
              members: { createMany: { data: [{ userId }, { userId: guardianUserId }] } },
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

  async compare(shortlistId: string, userId: string) {
    await this.assertShortlistOwner(shortlistId, userId);
    const entries = await this.prisma.shortlistTalent.findMany({
      where: { shortlistId },
      include: {
        talent: {
          select: {
            ...TALENT_SELECT,
            languages: { include: { language: true } },
            videos: { include: { mediaFile: true }, take: 1 },
          },
        },
        application: {
          select: { id: true, status: true, coverNote: true, rating: true, tags: true },
        },
      },
    });
    return entries.map((e) => ({ ...e.talent, application: e.application, note: e.note }));
  }

  async getCompCards(shortlistId: string, userId: string) {
    await this.assertShortlistOwner(shortlistId, userId);
    const entries = await this.prisma.shortlistTalent.findMany({
      where: { shortlistId },
      include: {
        talent: {
          select: {
            id: true, firstName: true, lastName: true, dateOfBirth: true,
            gender: true, height: true, weight: true, eyeColor: true, hairColor: true,
            photos: {
              include: { mediaFile: true },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 6,
            },
            skills: { include: { skill: true } },
            credits: { orderBy: { year: 'desc' }, take: 5 },
          },
        },
      },
    });
    return entries.map((e) => e.talent);
  }
}
