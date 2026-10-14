import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvitationDto, RespondInvitationDto } from './invitations.dto';
import { InvitationStatus, ProjectStatus } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Professional: send invitation ────────────────────────────────────────

  async create(userId: string, dto: CreateInvitationDto) {
    // Resolve the full chain: Professional → Project → Role → Talent → Guardian
    const professional = await this.prisma.professionalProfile.findUnique({ where: { userId } });
    if (!professional) throw new NotFoundException('Professional profile not found');

    const project = await this.prisma.castingProject.findUnique({
      where: { id: dto.projectId },
      include: { professional: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.professional?.userId !== userId) throw new ForbiddenException();
    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException('Can only invite to published projects');
    }

    if (dto.roleId) {
      const role = await this.prisma.castingRole.findFirst({
        where: { id: dto.roleId, projectId: dto.projectId },
      });
      if (!role) throw new NotFoundException('Role not found in this project');
      if (role.isFilled) throw new BadRequestException('This role is already filled');
    }

    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: dto.talentId },
      include: { guardian: { select: { userId: true } } },
    });
    if (!talent) throw new NotFoundException('Talent not found');

    // Duplicate check
    const existing = await this.prisma.invitation.findFirst({
      where: {
        projectId: dto.projectId,
        roleId: dto.roleId ?? null,
        talentId: dto.talentId,
        status: InvitationStatus.PENDING,
      },
    });
    if (existing) throw new ConflictException('An active invitation already exists for this talent/role');

    const invitation = await this.prisma.invitation.create({
      data: {
        projectId: dto.projectId,
        roleId: dto.roleId,
        talentId: dto.talentId,
        sentByUserId: userId,
        guardianUserId: talent.guardian.userId,
        message: dto.message,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: InvitationStatus.PENDING,
      },
      include: {
        project: { select: { id: true, title: true } },
        role: { select: { id: true, name: true } },
        talent: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notify guardian via message
    await this.prisma.conversation.create({
      data: {
        subject: `Invitation: ${project.title}`,
        members: { createMany: { data: [{ userId }, { userId: talent.guardian.userId }] } },
        messages: {
          create: {
            senderId: userId,
            body: dto.message ?? `You have been invited to audition for "${project.title}"`,
          },
        },
      },
    });

    return invitation;
  }

  // ─── List invitations ──────────────────────────────────────────────────────

  async list(userId: string) {
    // Works for both professional (sent) and guardian (received)
    const [sent, received] = await Promise.all([
      this.prisma.invitation.findMany({
        where: { sentByUserId: userId },
        include: {
          project: { select: { id: true, title: true } },
          role: { select: { id: true, name: true } },
          talent: { select: { id: true, firstName: true, lastName: true, headshot: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invitation.findMany({
        where: { guardianUserId: userId },
        include: {
          project: { select: { id: true, title: true, location: true, auditionMethod: true } },
          role: { select: { id: true, name: true, compensation: true } },
          talent: { select: { id: true, firstName: true, lastName: true, headshot: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { sent, received };
  }

  async getOne(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        project: true,
        role: true,
        talent: {
          include: {
            photos: { where: { isPrimary: true }, include: { mediaFile: true }, take: 1 },
            skills: { include: { skill: true } },
          },
        },
      },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.sentByUserId !== userId && invitation.guardianUserId !== userId) {
      throw new ForbiddenException();
    }
    return invitation;
  }

  // ─── Guardian: respond ─────────────────────────────────────────────────────

  async accept(invitationId: string, userId: string, dto: RespondInvitationDto) {
    const invitation = await this.assertGuardianOwns(invitationId, userId);
    this.assertPending(invitation);

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });
  }

  async decline(invitationId: string, userId: string, dto: RespondInvitationDto) {
    const invitation = await this.assertGuardianOwns(invitationId, userId);
    this.assertPending(invitation);

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.DECLINED,
        respondedAt: new Date(),
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertGuardianOwns(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.guardianUserId !== userId) throw new ForbiddenException();
    return invitation;
  }

  private assertPending(invitation: { status: InvitationStatus; expiresAt: Date | null }) {
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is already ${invitation.status}`);
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }
  }
}
