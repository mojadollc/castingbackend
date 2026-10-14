import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProjectStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Recommended castings for a guardian's talents ─────────────────────────

  async recommendCastings(userId: string) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        talents: {
          include: {
            skills: { include: { skill: true } },
            languages: { include: { language: true } },
            country: true,
          },
        },
      },
    });
    if (!guardian) throw new NotFoundException('Guardian profile not found');
    if (!guardian.talents.length) {
      return { items: [], message: 'Add a talent profile to get recommendations' };
    }

    const castings = await this.prisma.castingProject.findMany({
      where: {
        status: ProjectStatus.PUBLISHED,
        isPublic: true,
        OR: [{ applicationEnd: null }, { applicationEnd: { gte: new Date() } }],
      },
      include: {
        roles: true,
        professional: {
          select: { id: true, firstName: true, lastName: true, companyName: true, isVerified: true },
        },
      },
      take: 200,
    });

    const scored = castings.map((casting) => {
      const bestScore = Math.max(
        0,
        ...guardian.talents.map((talent) => this.scoreTalentVsCasting(talent, casting)),
      );
      return { casting, score: bestScore };
    });

    const items = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ casting, score }) => ({ ...casting, matchScore: score }));

    return { items, total: items.length };
  }

  // ─── Recommended talents for a casting role ────────────────────────────────

  async recommendTalents(userId: string, roleId: string) {
    const role = await this.prisma.castingRole.findUnique({
      where: { id: roleId },
      include: { project: { include: { professional: { select: { userId: true } } } } },
    });
    if (!role || role.project.professional?.userId !== userId) {
      throw new NotFoundException('Role not found');
    }

    const talents = await this.prisma.talentProfile.findMany({
      where: { isAvailable: true, profileCompletion: { gte: 40 } },
      include: {
        skills: { include: { skill: true } },
        languages: { include: { language: true } },
        photos: { where: { isPrimary: true }, take: 1, include: { mediaFile: true } },
        country: true,
      },
      take: 500,
    });

    const scored = talents.map((talent) => ({
      talent,
      score: this.scoreTalentVsRole(talent, role),
    }));

    const items = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ talent, score }) => ({ ...talent, matchScore: score }));

    return { items, total: items.length, roleId };
  }

  // ─── Scoring ───────────────────────────────────────────────────────────────

  private scoreTalentVsCasting(talent: any, casting: any): number {
    let score = 0;
    for (const role of casting.roles) {
      score = Math.max(score, this.scoreTalentVsRole(talent, role));
    }
    if (casting.isRemote) score += 5;
    if (talent.country && casting.location?.toLowerCase().includes(talent.country.name.toLowerCase())) {
      score += 10;
    }
    return score;
  }

  private scoreTalentVsRole(talent: any, role: any): number {
    const ageYears = dayjs().diff(dayjs(talent.dateOfBirth), 'year');

    if (role.ageMin && ageYears < role.ageMin) return 0;
    if (role.ageMax && ageYears > role.ageMax) return 0;
    if (role.genderReq && role.genderReq !== talent.gender) return 0;
    if (role.isFilled) return 0;

    let score = 10; // base

    // Age proximity score
    if (role.ageMin && role.ageMax) {
      const mid = (role.ageMin + role.ageMax) / 2;
      const range = Math.max((role.ageMax - role.ageMin) / 2, 1);
      score += Math.max(0, 20 - Math.abs(ageYears - mid) * (20 / range));
    }

    // Skills overlap
    if (Array.isArray(role.skills)) {
      const talentSkills = talent.skills.map((s: any) => s.skill.name.toLowerCase());
      const overlap = (role.skills as string[]).filter((s) => talentSkills.includes(s.toLowerCase())).length;
      score += overlap * 15;
    }

    // Language overlap
    if (Array.isArray(role.languages)) {
      const talentLangs = talent.languages.map((l: any) => l.language.code.toLowerCase());
      const overlap = (role.languages as string[]).filter((l) => talentLangs.includes(l.toLowerCase())).length;
      score += overlap * 10;
    }

    // Profile completeness bonus
    score += Math.floor((talent.profileCompletion ?? 0) / 10);

    // Media bonus
    if (talent.photos?.length > 0) score += 5;

    return score;
  }
}
