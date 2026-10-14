import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateConversationDto, SendMessageDto, ReportConversationDto } from './messaging.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getConversationOrFail(id: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    const isMember = conv.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a member of this conversation');
    return conv;
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async listConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: { include: { conversation: false } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: { id: true, role: true } } },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => {
      const conv = m.conversation;
      const lastMessage = conv.messages[0] ?? null;
      const unread = lastMessage && m.lastReadAt
        ? lastMessage.createdAt > m.lastReadAt && lastMessage.sender?.id !== userId
        : !!lastMessage && lastMessage.sender?.id !== userId;
      return {
        id: conv.id,
        subject: conv.subject,
        lastMessage: lastMessage ? { body: lastMessage.body, createdAt: lastMessage.createdAt } : null,
        unread,
        updatedAt: conv.updatedAt,
        memberCount: conv.members.length,
      };
    });
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createConversation(senderUserId: string, dto: CreateConversationDto) {
    // Professionals must message guardians — enforce the routing rule
    const guardian = await this.prisma.user.findUnique({
      where: { id: dto.guardianUserId },
      include: { guardianProfile: true },
    });
    if (!guardian?.guardianProfile) {
      throw new BadRequestException('Target user must be a guardian');
    }

    // Check for existing conversation between these two users
    const existing = await this.prisma.conversation.findFirst({
      where: {
        members: {
          every: { userId: { in: [senderUserId, dto.guardianUserId] } },
        },
        AND: [
          { members: { some: { userId: senderUserId } } },
          { members: { some: { userId: dto.guardianUserId } } },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        subject: dto.subject,
        members: {
          create: [
            { userId: senderUserId },
            { userId: dto.guardianUserId },
          ],
        },
        messages: {
          create: {
            senderId: senderUserId,
            body: dto.message,
          },
        },
      },
      include: { members: true, messages: { take: 1 } },
    });
  }

  // ─── Get one ───────────────────────────────────────────────────────────────

  async getConversation(id: string, userId: string) {
    return this.getConversationOrFail(id, userId);
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  async getMessages(conversationId: string, userId: string, cursor?: string) {
    await this.getConversationOrFail(conversationId, userId);

    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, role: true } },
        attachments: { include: { mediaFile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    await this.getConversationOrFail(conversationId, userId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: dto.body,
        ...(dto.attachmentIds?.length
          ? {
              attachments: {
                create: dto.attachmentIds.map((mediaFileId) => ({ mediaFileId })),
              },
            }
          : {}),
      },
      include: {
        sender: { select: { id: true, role: true } },
        attachments: { include: { mediaFile: true } },
      },
    });

    // Bump conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // ─── Read receipt ──────────────────────────────────────────────────────────

  async markRead(conversationId: string, userId: string) {
    await this.getConversationOrFail(conversationId, userId);
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }

  // ─── Report ────────────────────────────────────────────────────────────────

  async reportConversation(conversationId: string, userId: string, dto: ReportConversationDto) {
    await this.getConversationOrFail(conversationId, userId);
    return this.prisma.report.create({
      data: {
        reportedById: userId,
        entityType: 'conversation',
        entityId: conversationId,
        reason: dto.reason,
        description: dto.description,
      },
    });
  }

  // ─── Block ─────────────────────────────────────────────────────────────────

  async blockConversation(conversationId: string, userId: string) {
    // For now: remove the requesting user from the conversation (soft block)
    await this.getConversationOrFail(conversationId, userId);
    await this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
    return { success: true, message: 'Conversation blocked' };
  }
}
