import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateCastingDto, UpdateCastingDto, ListCastingsQueryDto,
  ExtendCastingDto, CreateRoleDto, UpdateRoleDto,
} from './casting.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class CastingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Ownership helper ──────────────────────────────────────────────────────

  private async assertOwner(castingId: string, userId: string) {
    const project = await this.prisma.castingProject.findUnique({
      where: { id: castingId },
      include: { professional: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Casting project not found');
    if (project.professional?.userId !== userId) throw new ForbiddenException();
    return project;
  }

  private async getProfessionalId(userId: string): Promise<string> {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Professional profile not found');
    return profile.id;
  }

  // ─── Projects ──────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateCastingDto) {
    const professionalId = await this.getProfessionalId(userId);
    return this.prisma.castingProject.create({
      data: {
        professionalId,
        organizationId: dto.organizationId,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        projectType: dto.projectType,
        auditionMethod: dto.auditionMethod,
        applicationStart: dto.applicationStart ? new Date(dto.applicationStart) : undefined,
        applicationEnd: dto.applicationEnd ? new Date(dto.applicationEnd) : undefined,
        shootStart: dto.shootStart ? new Date(dto.shootStart) : undefined,
        shootEnd: dto.shootEnd ? new Date(dto.shootEnd) : undefined,
        location: dto.location,
        isRemote: dto.isRemote,
        isPaid: dto.isPaid,
        compensation: dto.compensation,
        isPublic: dto.isPublic,
        status: ProjectStatus.DRAFT,
      },
      include: { roles: true, _count: { select: { applications: true } } },
    });
  }

  async findAll(query: ListCastingsQueryDto, userId?: string) {
    const { page = 1, limit = 20, search, status, categoryId, projectType, isPaid } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      // Professional sees their own projects in any status
      const profile = await this.prisma.professionalProfile.findUnique({ where: { userId } });
      if (profile) where.professionalId = profile.id;
    } else {
      // Public listing — only published
      where.status = ProjectStatus.PUBLISHED;
      where.isPublic = true;
    }

    if (status && userId) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    if (projectType) where.projectType = projectType;
    if (isPaid !== undefined) where.isPaid = isPaid;

    const [data, total] = await Promise.all([
      this.prisma.castingProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: { select: { id: true, name: true, spotsTotal: true, spotsFilled: true, isFilled: true } },
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.castingProject.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(castingId: string) {
    const project = await this.prisma.castingProject.findUnique({
      where: { id: castingId },
      include: {
        roles: true,
        attachments: { include: { mediaFile: true } },
        professional: { select: { id: true, firstName: true, lastName: true, companyName: true, isVerified: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!project) throw new NotFoundException('Casting project not found');

    // Increment view count (fire and forget)
    this.prisma.castingProject.update({
      where: { id: castingId },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return project;
  }

  async update(castingId: string, userId: string, dto: UpdateCastingDto) {
    const project = await this.assertOwner(castingId, userId);
    this.assertEditable(project.status);

    const data: any = { ...dto };
    if (dto.applicationStart) data.applicationStart = new Date(dto.applicationStart);
    if (dto.applicationEnd) data.applicationEnd = new Date(dto.applicationEnd);
    if (dto.shootStart) data.shootStart = new Date(dto.shootStart);
    if (dto.shootEnd) data.shootEnd = new Date(dto.shootEnd);

    return this.prisma.castingProject.update({
      where: { id: castingId },
      data,
      include: { roles: true },
    });
  }

  async remove(castingId: string, userId: string) {
    const project = await this.assertOwner(castingId, userId);
    this.assertEditable(project.status);
    await this.prisma.castingProject.delete({ where: { id: castingId } });
    return { message: 'Casting project deleted' };
  }

  // ─── Lifecycle actions ─────────────────────────────────────────────────────

  async submit(castingId: string, userId: string) {
    const project = await this.assertOwner(castingId, userId);
    if (project.status !== ProjectStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT projects can be submitted for review');
    }

    const roleCount = await this.prisma.castingRole.count({ where: { projectId: castingId } });
    if (roleCount === 0) throw new BadRequestException('Add at least one role before submitting');

    return this.prisma.castingProject.update({
      where: { id: castingId },
      data: { status: ProjectStatus.PENDING_REVIEW, submittedAt: new Date() },
    });
  }

  async publish(castingId: string, userId: string) {
    // Admins call this after moderation — professionals can self-publish from PENDING_REVIEW
    const project = await this.assertOwner(castingId, userId);
    const allowedStatuses: ProjectStatus[] = [ProjectStatus.PENDING_REVIEW, ProjectStatus.PAUSED];
    if (!allowedStatuses.includes(project.status as ProjectStatus)) {
      throw new BadRequestException(`Cannot publish a project in ${project.status} status`);
    }

    return this.prisma.castingProject.update({
      where: { id: castingId },
      data: { status: ProjectStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async pause(castingId: string, userId: string) {
    const project = await this.assertOwner(castingId, userId);
    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED projects can be paused');
    }
    return this.prisma.castingProject.update({
      where: { id: castingId },
      data: { status: ProjectStatus.PAUSED },
    });
  }

  async extend(castingId: string, userId: string, dto: ExtendCastingDto) {
    const project = await this.assertOwner(castingId, userId);
    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED projects can be extended');
    }
    const newEnd = new Date(dto.applicationEnd);
    if (project.applicationEnd && newEnd <= project.applicationEnd) {
      throw new BadRequestException('New end date must be after the current end date');
    }
    return this.prisma.castingProject.update({
      where: { id: castingId },
      data: { applicationEnd: newEnd },
    });
  }

  async duplicate(castingId: string, userId: string) {
    const project = await this.assertOwner(castingId, userId);
    const professionalId = await this.getProfessionalId(userId);

    const { id, createdAt, updatedAt, status, submittedAt, publishedAt,
      viewCount, applications, ...rest } = project as any;

    const newProject = await this.prisma.castingProject.create({
      data: {
        ...rest,
        professionalId,
        title: `${project.title} (Copy)`,
        status: ProjectStatus.DRAFT,
        submittedAt: null,
        publishedAt: null,
        viewCount: 0,
      },
    });

    // Duplicate roles
    const roles = await this.prisma.castingRole.findMany({ where: { projectId: castingId } });
    if (roles.length > 0) {
      await this.prisma.castingRole.createMany({
        data: roles.map(({ id: _id, createdAt: _ca, updatedAt: _ua, spotsFilled: _sf, isFilled: _if, skills, languages, applicationRequirements, ...r }) => ({
          ...r,
          projectId: newProject.id,
          spotsFilled: 0,
          isFilled: false,
          skills: skills ?? undefined,
          languages: languages ?? undefined,
          applicationRequirements: applicationRequirements ?? undefined,
        })),
      });
    }

    return this.prisma.castingProject.findUnique({
      where: { id: newProject.id },
      include: { roles: true },
    });
  }

  async close(castingId: string, userId: string) {
    const project = await this.assertOwner(castingId, userId);
    const closeable: ProjectStatus[] = [ProjectStatus.PUBLISHED, ProjectStatus.PAUSED];
    if (!closeable.includes(project.status as ProjectStatus)) {
      throw new BadRequestException(`Cannot close a project in ${project.status} status`);
    }
    return this.prisma.castingProject.update({
      where: { id: castingId },
      data: { status: ProjectStatus.CLOSED },
    });
  }

  // ─── Roles ─────────────────────────────────────────────────────────────────

  async createRole(castingId: string, userId: string, dto: CreateRoleDto) {
    const project = await this.assertOwner(castingId, userId);
    this.assertEditable(project.status);

    return this.prisma.castingRole.create({
      data: {
        projectId: castingId,
        name: dto.name,
        description: dto.description,
        genderReq: dto.genderReq,
        ageMin: dto.ageMin,
        ageMax: dto.ageMax,
        experienceLevel: dto.experienceLevel,
        skills: dto.skills ?? [],
        languages: dto.languages ?? [],
        location: dto.location,
        isRemote: dto.isRemote,
        isPaid: dto.isPaid,
        compensation: dto.compensation,
        compensationAmount: dto.compensationAmount,
        compensationCurrency: dto.compensationCurrency ?? 'USD',
        applicationRequirements: dto.applicationRequirements ?? {},
        spotsTotal: dto.spotsTotal ?? 1,
      },
    });
  }

  async getRoles(castingId: string) {
    await this.prisma.castingProject.findUniqueOrThrow({ where: { id: castingId } });
    return this.prisma.castingRole.findMany({
      where: { projectId: castingId },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRole(castingId: string, roleId: string) {
    const role = await this.prisma.castingRole.findFirst({
      where: { id: roleId, projectId: castingId },
      include: { _count: { select: { applications: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async updateRole(castingId: string, roleId: string, userId: string, dto: UpdateRoleDto) {
    const project = await this.assertOwner(castingId, userId);
    this.assertEditable(project.status);
    await this.getRole(castingId, roleId);

    const data: any = { ...dto };
    if (dto.skills) data.skills = dto.skills;
    if (dto.languages) data.languages = dto.languages;

    return this.prisma.castingRole.update({ where: { id: roleId }, data });
  }

  async deleteRole(castingId: string, roleId: string, userId: string) {
    const project = await this.assertOwner(castingId, userId);
    this.assertEditable(project.status);
    await this.getRole(castingId, roleId);
    await this.prisma.castingRole.delete({ where: { id: roleId } });
    return { message: 'Role deleted' };
  }

  async fillRole(castingId: string, roleId: string, userId: string) {
    await this.assertOwner(castingId, userId);
    const role = await this.getRole(castingId, roleId);
    if (role.isFilled) throw new ConflictException('Role is already filled');

    return this.prisma.castingRole.update({
      where: { id: roleId },
      data: { isFilled: true, spotsFilled: role.spotsTotal },
    });
  }

  // ─── Guard helper ──────────────────────────────────────────────────────────

  private assertEditable(status: string) {
    const editable: ProjectStatus[] = [ProjectStatus.DRAFT, ProjectStatus.PAUSED];
    if (!editable.includes(status as ProjectStatus)) {
      throw new BadRequestException(`Project in ${status} status cannot be edited`);
    }
  }
}
