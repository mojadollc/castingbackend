import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  UpdateTalentProfileDto, UpdatePhotoDto, AddVideoDto, AddAudioDto,
  SetSkillsDto, SetLanguagesDto, CreateCreditDto, UpdateCreditDto,
} from './talents.dto';
import { UserRole } from '@prisma/client';
import { filterTalentProfile } from '../common/utils/talent-profile-view';

@Injectable()
export class TalentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Access guard ──────────────────────────────────────────────────────────

  private async assertOwnership(talentId: string, userId: string) {
    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: { guardian: { select: { userId: true } } },
    });
    if (!talent) throw new NotFoundException('Talent not found');
    if (talent.guardian.userId !== userId) throw new ForbiddenException();
    return talent;
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  async getProfile(talentId: string, viewerRole?: UserRole, viewerUserId?: string) {
    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: {
        guardian: { select: { userId: true } },
        photos: { include: { mediaFile: true } },
        skills: { include: { skill: true } },
        languages: { include: { language: true } },
        credits: true,
        socialLinks: true,
        country: true,
      },
    });
    if (!talent) throw new NotFoundException('Talent not found');
    return filterTalentProfile(talent, viewerRole, viewerUserId);
  }

  async updateProfile(talentId: string, userId: string, dto: UpdateTalentProfileDto) {
    await this.assertOwnership(talentId, userId);
    const talent = await this.prisma.talentProfile.update({
      where: { id: talentId },
      data: dto,
    });
    await this.recalculateCompletion(talentId);
    return talent;
  }

  // ─── Photos ────────────────────────────────────────────────────────────────

  async getPhotos(talentId: string) {
    return this.prisma.talentPhoto.findMany({
      where: { talentId },
      include: { mediaFile: true },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async addPhoto(talentId: string, userId: string, mediaFileId: string) {
    await this.assertOwnership(talentId, userId);
    const count = await this.prisma.talentPhoto.count({ where: { talentId } });
    const photo = await this.prisma.talentPhoto.create({
      data: { talentId, mediaFileId, isPrimary: count === 0 },
    });
    await this.recalculateCompletion(talentId);
    return photo;
  }

  async updatePhoto(talentId: string, userId: string, photoId: string, dto: UpdatePhotoDto) {
    await this.assertOwnership(talentId, userId);
    if (dto.isPrimary) {
      await this.prisma.talentPhoto.updateMany({ where: { talentId }, data: { isPrimary: false } });
    }
    return this.prisma.talentPhoto.update({ where: { id: photoId }, data: dto });
  }

  async deletePhoto(talentId: string, userId: string, photoId: string) {
    await this.assertOwnership(talentId, userId);
    await this.prisma.talentPhoto.delete({ where: { id: photoId } });
    await this.recalculateCompletion(talentId);
    return { message: 'Photo deleted' };
  }

  // ─── Videos ────────────────────────────────────────────────────────────────

  async getVideos(talentId: string) {
    return this.prisma.talentVideo.findMany({
      where: { talentId },
      include: { mediaFile: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addVideo(talentId: string, userId: string, dto: AddVideoDto) {
    await this.assertOwnership(talentId, userId);
    const video = await this.prisma.talentVideo.create({
      data: { talentId, mediaFileId: dto.mediaFileId, title: dto.title, description: dto.description },
    });
    await this.recalculateCompletion(talentId);
    return video;
  }

  async deleteVideo(talentId: string, userId: string, videoId: string) {
    await this.assertOwnership(talentId, userId);
    await this.prisma.talentVideo.delete({ where: { id: videoId } });
    return { message: 'Video deleted' };
  }

  // ─── Audio ─────────────────────────────────────────────────────────────────

  async getAudio(talentId: string) {
    return this.prisma.talentAudio.findMany({
      where: { talentId },
      include: { mediaFile: true },
    });
  }

  async addAudio(talentId: string, userId: string, dto: AddAudioDto) {
    await this.assertOwnership(talentId, userId);
    return this.prisma.talentAudio.create({
      data: { talentId, mediaFileId: dto.mediaFileId, title: dto.title },
    });
  }

  // ─── Skills ────────────────────────────────────────────────────────────────

  async getSkills(talentId: string) {
    return this.prisma.talentSkill.findMany({
      where: { talentId },
      include: { skill: true },
    });
  }

  async setSkills(talentId: string, userId: string, dto: SetSkillsDto) {
    await this.assertOwnership(talentId, userId);
    await this.prisma.talentSkill.deleteMany({ where: { talentId } });
    await this.prisma.talentSkill.createMany({
      data: dto.skills.map((s) => ({ talentId, skillId: s.skillId, level: s.level })),
    });
    await this.recalculateCompletion(talentId);
    return this.getSkills(talentId);
  }

  // ─── Languages ─────────────────────────────────────────────────────────────

  async getLanguages(talentId: string) {
    return this.prisma.talentLanguage.findMany({
      where: { talentId },
      include: { language: true },
    });
  }

  async setLanguages(talentId: string, userId: string, dto: SetLanguagesDto) {
    await this.assertOwnership(talentId, userId);
    await this.prisma.talentLanguage.deleteMany({ where: { talentId } });
    await this.prisma.talentLanguage.createMany({
      data: dto.languages.map((l) => ({ talentId, languageId: l.languageId, fluency: l.fluency })),
    });
    return this.getLanguages(talentId);
  }

  // ─── Credits ───────────────────────────────────────────────────────────────

  async getCredits(talentId: string) {
    return this.prisma.talentCredit.findMany({
      where: { talentId },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createCredit(talentId: string, userId: string, dto: CreateCreditDto) {
    await this.assertOwnership(talentId, userId);
    const credit = await this.prisma.talentCredit.create({ data: { talentId, ...dto } });
    await this.recalculateCompletion(talentId);
    return credit;
  }

  async updateCredit(talentId: string, userId: string, creditId: string, dto: UpdateCreditDto) {
    await this.assertOwnership(talentId, userId);
    return this.prisma.talentCredit.update({ where: { id: creditId }, data: dto });
  }

  async deleteCredit(talentId: string, userId: string, creditId: string) {
    await this.assertOwnership(talentId, userId);
    await this.prisma.talentCredit.delete({ where: { id: creditId } });
    return { message: 'Credit deleted' };
  }

  // ─── Profile Completion ────────────────────────────────────────────────────

  async getCompletion(talentId: string) {
    const score = await this.recalculateCompletion(talentId);
    return { talentId, completion: score, sections: this.getCompletionBreakdown(score) };
  }

  private async recalculateCompletion(talentId: string): Promise<number> {
    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: {
        photos: true,
        videos: true,
        skills: true,
        languages: true,
        credits: true,
      },
    });
    if (!talent) return 0;

    let score = 0;
    if (talent.firstName && talent.lastName) score += 10;
    if (talent.dateOfBirth) score += 10;
    if (talent.gender) score += 5;
    if (talent.bio) score += 10;
    if (talent.headshot || talent.photos.length > 0) score += 15;
    if (talent.photos.length >= 3) score += 10;
    if (talent.videos.length > 0) score += 10;
    if (talent.skills.length > 0) score += 10;
    if (talent.languages.length > 0) score += 5;
    if (talent.credits.length > 0) score += 10;
    if (talent.height && talent.weight) score += 5;

    await this.prisma.talentProfile.update({
      where: { id: talentId },
      data: { profileCompletion: score },
    });

    return score;
  }

  private getCompletionBreakdown(score: number) {
    return { total: score, status: score >= 80 ? 'complete' : score >= 50 ? 'partial' : 'incomplete' };
  }

  // ─── Comp Card ─────────────────────────────────────────────────────────────

  async getCompCard(talentId: string) {
    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: {
        photos: { include: { mediaFile: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 6 },
        skills: { include: { skill: true } },
        credits: { orderBy: { year: 'desc' }, take: 5 },
      },
    });
    if (!talent) throw new NotFoundException('Talent not found');
    return talent;
  }
}
