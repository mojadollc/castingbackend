import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationType } from '@prisma/client';
import { UpdateNotificationPreferencesDto } from './notifications.dto';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Core dispatch (called by other services) ──────────────────────────────

  async send(payload: NotificationPayload) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId: payload.userId },
    });

    // Always create in-app notification
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      },
    });

    // Email / SMS / Push — stubbed for integration (Sendgrid, Twilio, FCM)
    if (!prefs || prefs.email) {
      // TODO: await this.emailService.send(...)
    }
    if (!prefs || prefs.sms) {
      // TODO: await this.smsService.send(...)
    }
    if (!prefs || prefs.push) {
      // TODO: await this.pushService.send(...)
    }

    return notification;
  }

  // ─── Event helpers (called by other modules) ───────────────────────────────

  async notifyApplicationSubmitted(guardianUserId: string, projectTitle: string, talentName: string) {
    return this.send({
      userId: guardianUserId,
      type: NotificationType.APPLICATION_UPDATE,
      title: 'Application Submitted',
      body: `${talentName}'s application to "${projectTitle}" was submitted.`,
      data: { event: 'application_submitted' },
    });
  }

  async notifyApplicationStatusChanged(guardianUserId: string, status: string, projectTitle: string) {
    return this.send({
      userId: guardianUserId,
      type: NotificationType.APPLICATION_UPDATE,
      title: 'Application Update',
      body: `Your application for "${projectTitle}" is now ${status}.`,
      data: { event: 'application_status_changed', status },
    });
  }

  async notifyAuditionScheduled(guardianUserId: string, projectTitle: string, scheduledAt: Date) {
    return this.send({
      userId: guardianUserId,
      type: NotificationType.AUDITION_SCHEDULED,
      title: 'Audition Scheduled',
      body: `An audition for "${projectTitle}" has been scheduled for ${scheduledAt.toLocaleDateString()}.`,
      data: { event: 'audition_scheduled' },
    });
  }

  async notifyNewMessage(recipientUserId: string, senderName: string) {
    return this.send({
      userId: recipientUserId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: 'New Message',
      body: `You have a new message from ${senderName}.`,
      data: { event: 'new_message' },
    });
  }

  async notifyInvitation(guardianUserId: string, projectTitle: string, roleName: string) {
    return this.send({
      userId: guardianUserId,
      type: NotificationType.INVITATION,
      title: 'Casting Invitation',
      body: `You've been invited to audition for "${roleName}" in "${projectTitle}".`,
      data: { event: 'invitation_received' },
    });
  }

  // ─── User-facing API ───────────────────────────────────────────────────────

  async list(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, total, unread, page, pages: Math.ceil(total / take) };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // ─── Preferences ──────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }
}
