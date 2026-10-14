import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto,
} from './organizations.dto';
import { OrgMemberRole } from '@prisma/client';

// Roles that can manage the org
const ADMIN_ROLES: OrgMemberRole[] = [OrgMemberRole.ADMIN];

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getMemberOrFail(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
    return member;
  }

  private async requireAdmin(orgId: string, userId: string) {
    const member = await this.getMemberOrFail(orgId, userId);
    if (!ADMIN_ROLES.includes(member.role)) {
      throw new ForbiddenException('Admin access required');
    }
    return member;
  }

  // ─── Org CRUD ──────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already taken');

    return this.prisma.organization.create({
      data: {
        ...dto,
        members: {
          create: { userId, role: OrgMemberRole.ADMIN },
        },
      },
      include: { members: true },
    });
  }

  async getOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, role: true } } },
        },
        _count: { select: { projects: true, members: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, userId: string, dto: UpdateOrganizationDto) {
    await this.requireAdmin(id, userId);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  async inviteMember(orgId: string, userId: string, dto: InviteMemberDto) {
    await this.requireAdmin(orgId, userId);

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException('User is already a member');

    return this.prisma.organizationMember.create({
      data: { organizationId: orgId, userId: dto.userId, role: dto.role },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }

  async listMembers(orgId: string, userId: string) {
    await this.getMemberOrFail(orgId, userId);
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }

  async updateMember(orgId: string, memberId: string, userId: string, dto: UpdateMemberRoleDto) {
    await this.requireAdmin(orgId, userId);
    const member = await this.prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== orgId) throw new NotFoundException('Member not found');
    return this.prisma.organizationMember.update({ where: { id: memberId }, data: { role: dto.role } });
  }

  async removeMember(orgId: string, memberId: string, userId: string) {
    await this.requireAdmin(orgId, userId);
    const member = await this.prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== orgId) throw new NotFoundException('Member not found');
    // Prevent removing the last admin
    if (ADMIN_ROLES.includes(member.role)) {
      const adminCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: { in: ADMIN_ROLES } },
      });
      if (adminCount <= 1) throw new ForbiddenException('Cannot remove the last admin');
    }
    await this.prisma.organizationMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  // ─── Projects ──────────────────────────────────────────────────────────────

  async listProjects(orgId: string, userId: string) {
    await this.getMemberOrFail(orgId, userId);
    return this.prisma.castingProject.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { applications: true, roles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
