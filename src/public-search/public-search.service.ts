import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PublicCastingSearchDto } from './public-search.dto';
import { ProjectStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class PublicSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchCastings(query: PublicCastingSearchDto) {
    const { keyword, country, city, category, minAge, maxAge,
      auditionMethod, paid, remote, sort = 'latest', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: ProjectStatus.PUBLISHED,
      isPublic: true,
    };

    // Keyword search across title and description
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // Location filters
    if (country || city) {
      where.location = {};
      if (country) where.location.contains = country;
      if (city) {
        where.OR = [
          ...(where.OR ?? []),
          { location: { contains: city, mode: 'insensitive' } },
        ];
      }
    }

    // Category
    if (category) {
      const cat = await this.prisma.castingCategory.findFirst({
        where: { slug: { equals: category, mode: 'insensitive' } },
      });
      if (cat) where.categoryId = cat.id;
    }

    // Audition method
    if (auditionMethod) where.auditionMethod = auditionMethod;

    // Paid / remote
    if (paid !== undefined) where.isPaid = paid;
    if (remote !== undefined) where.isRemote = remote;

    // Age filter — match against roles
    if (minAge !== undefined || maxAge !== undefined) {
      where.roles = {
        some: {
          ...(minAge !== undefined && { ageMax: { gte: minAge } }),
          ...(maxAge !== undefined && { ageMin: { lte: maxAge } }),
        },
      };
    }

    // Only show projects with open application window
    where.AND = [
      {
        OR: [
          { applicationEnd: null },
          { applicationEnd: { gte: new Date() } },
        ],
      },
    ];

    const orderBy = this.buildOrderBy(sort);

    const [data, total] = await Promise.all([
      this.prisma.castingProject.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          projectType: true,
          auditionMethod: true,
          location: true,
          isRemote: true,
          isPaid: true,
          compensation: true,
          applicationEnd: true,
          publishedAt: true,
          viewCount: true,
          professional: {
            select: { firstName: true, lastName: true, companyName: true, isVerified: true },
          },
          roles: {
            select: { id: true, name: true, genderReq: true, ageMin: true, ageMax: true,
              isPaid: true, compensation: true, spotsTotal: true, spotsFilled: true, isFilled: true },
          },
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.castingProject.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCastingBySlug(slug: string) {
    const project = await this.prisma.castingProject.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        status: ProjectStatus.PUBLISHED,
        isPublic: true,
      },
      include: {
        roles: true,
        attachments: { include: { mediaFile: { select: { id: true, cdnUrl: true, mimeType: true } } } },
        professional: {
          select: { id: true, firstName: true, lastName: true, companyName: true,
            avatarUrl: true, isVerified: true },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!project) throw new NotFoundException('Casting not found');

    // Increment view count
    this.prisma.castingProject.update({
      where: { id: project.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return project;
  }

  async getCategories() {
    return this.prisma.castingCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getLocations(search?: string) {
    // Return distinct locations from published projects
    const projects = await this.prisma.castingProject.findMany({
      where: {
        status: ProjectStatus.PUBLISHED,
        isPublic: true,
        location: {
          not: null,
          ...(search ? { contains: search, mode: 'insensitive' } : {}),
        },
      },
      select: { location: true },
      distinct: ['location'],
      take: 50,
      orderBy: { location: 'asc' },
    });

    return projects
      .map((p) => p.location)
      .filter(Boolean);
  }

  private buildOrderBy(sort: string) {
    switch (sort) {
      case 'deadline': return { applicationEnd: 'asc' as const };
      case 'popular': return { viewCount: 'desc' as const };
      default: return { publishedAt: 'desc' as const };
    }
  }
}
