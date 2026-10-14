import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SearchCastingsDto, SearchTalentsDto } from './search.dto';
import { ProjectStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Casting search ────────────────────────────────────────────────────────

  async searchCastings(dto: SearchCastingsDto) {
    const { page = 1, limit = 20, sort = 'newest' } = dto;
    const skip = (page - 1) * limit;

    const where: any = {
      status: ProjectStatus.PUBLISHED,
      isPublic: true,
    };

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    if (dto.location) where.location = { contains: dto.location, mode: 'insensitive' };
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if (dto.projectType) where.projectType = dto.projectType;
    if (dto.isPaid !== undefined) where.isPaid = dto.isPaid;
    if (dto.isRemote !== undefined) where.isRemote = dto.isRemote;

    // Age / gender filters apply at role level — filter projects that have matching roles
    const roleWhere: any = {};
    if (dto.ageMin !== undefined) roleWhere.ageMax = { gte: dto.ageMin };
    if (dto.ageMax !== undefined) roleWhere.ageMin = { lte: dto.ageMax };
    if (dto.gender) roleWhere.genderReq = dto.gender;
    if (Object.keys(roleWhere).length > 0) {
      where.roles = { some: roleWhere };
    }

    // Skills filter — match against role skills JSON array
    if (dto.skills) {
      const skillList = dto.skills.split(',').map((s) => s.trim());
      where.roles = {
        ...(where.roles ?? {}),
        some: {
          ...(where.roles?.some ?? {}),
          skills: { array_contains: skillList },
        },
      };
    }

    const orderBy = sort === 'deadline'
      ? { applicationEnd: 'asc' as const }
      : sort === 'popular'
      ? { viewCount: 'desc' as const }
      : { publishedAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.castingProject.findMany({
        where,
        include: {
          roles: {
            select: {
              id: true, name: true, genderReq: true, ageMin: true, ageMax: true,
              isPaid: true, spotsTotal: true, spotsFilled: true, isFilled: true,
            },
          },
          professional: {
            select: { id: true, firstName: true, lastName: true, companyName: true, isVerified: true },
          },
          _count: { select: { applications: true } },
        },
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.castingProject.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      facets: await this.castingFacets(),
    };
  }

  // ─── Talent search (professional-only) ────────────────────────────────────

  async searchTalents(dto: SearchTalentsDto) {
    const { page = 1, limit = 20, sort = 'newest' } = dto;
    const skip = (page - 1) * limit;

    const where: any = { isAvailable: true };

    if (dto.q) {
      where.OR = [
        { firstName: { contains: dto.q, mode: 'insensitive' } },
        { lastName: { contains: dto.q, mode: 'insensitive' } },
        { bio: { contains: dto.q, mode: 'insensitive' } },
      ];
    }

    if (dto.gender) where.gender = dto.gender;
    if (dto.hairColor) where.hairColor = { contains: dto.hairColor, mode: 'insensitive' };
    if (dto.eyeColor) where.eyeColor = { contains: dto.eyeColor, mode: 'insensitive' };
    if (dto.heightMin !== undefined) where.height = { ...(where.height ?? {}), gte: dto.heightMin };
    if (dto.heightMax !== undefined) where.height = { ...(where.height ?? {}), lte: dto.heightMax };
    if (dto.minCompletion !== undefined) where.profileCompletion = { gte: dto.minCompletion };

    // Age range → dateOfBirth range
    if (dto.ageMin !== undefined) {
      where.dateOfBirth = {
        ...(where.dateOfBirth ?? {}),
        lte: dayjs().subtract(dto.ageMin, 'year').toDate(),
      };
    }
    if (dto.ageMax !== undefined) {
      where.dateOfBirth = {
        ...(where.dateOfBirth ?? {}),
        gte: dayjs().subtract(dto.ageMax + 1, 'year').add(1, 'day').toDate(),
      };
    }

    if (dto.location) {
      // Match against country/state/city via nested relation — simplified to city name for now
      where.OR = [
        ...(where.OR ?? []),
        { country: { name: { contains: dto.location, mode: 'insensitive' } } },
      ];
    }

    // Skills filter
    if (dto.skills) {
      const skillNames = dto.skills.split(',').map((s) => s.trim());
      where.skills = {
        some: { skill: { name: { in: skillNames, mode: 'insensitive' } } },
      };
    }

    // Languages filter
    if (dto.languages) {
      const langCodes = dto.languages.split(',').map((l) => l.trim());
      where.languages = {
        some: { language: { code: { in: langCodes } } },
      };
    }

    if (dto.hasPhotos) where.photos = { some: {} };
    if (dto.hasVideos) where.videos = { some: {} };

    const orderBy = sort === 'completion'
      ? { profileCompletion: 'desc' as const }
      : sort === 'name'
      ? { firstName: 'asc' as const }
      : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.talentProfile.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, dateOfBirth: true,
          gender: true, headshot: true, height: true, eyeColor: true, hairColor: true,
          profileCompletion: true, isAvailable: true,
          skills: { include: { skill: true }, take: 5 },
          languages: { include: { language: true }, take: 3 },
          photos: { where: { isPrimary: true }, take: 1, include: { mediaFile: true } },
          country: { select: { name: true, code: true } },
        },
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.talentProfile.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      facets: await this.talentFacets(),
    };
  }

  // ─── Facets (for filter UI) ────────────────────────────────────────────────

  private async castingFacets() {
    const [categories, locations] = await Promise.all([
      this.prisma.castingCategory.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.castingProject.findMany({
        where: { status: ProjectStatus.PUBLISHED, location: { not: null } },
        select: { location: true },
        distinct: ['location'],
        take: 50,
      }),
    ]);
    return {
      categories,
      locations: locations.map((p) => p.location).filter(Boolean),
      projectTypes: ['film', 'tv', 'commercial', 'theatre', 'music_video', 'web_series', 'other'],
    };
  }

  private async talentFacets() {
    const [skills, languages] = await Promise.all([
      this.prisma.skill.findMany({ select: { id: true, name: true, category: true }, orderBy: { name: 'asc' } }),
      this.prisma.language.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
    ]);
    return {
      skills,
      languages,
      genders: ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'],
      hairColors: ['black', 'brown', 'blonde', 'red', 'grey', 'white', 'other'],
      eyeColors: ['brown', 'blue', 'green', 'hazel', 'grey', 'other'],
    };
  }
}
