import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApplicationsService } from '../../src/applications/applications.service';
import { PaymentsService } from '../../src/payments/payments.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { PrismaService } from '../../src/database/prisma.service';

// ─── Shared mock factory ──────────────────────────────────────────────────────

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    talentProfile: { findUnique: jest.fn() },
    castingProject: { findUnique: jest.fn() },
    application: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    guardianProfile: { findUnique: jest.fn() },
    subscriptionPlan: { findUnique: jest.fn() },
    subscription: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    coupon: { findUnique: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    notification: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    notificationPreference: { findUnique: jest.fn(), upsert: jest.fn() },
    applicationStatusHistory: { createMany: jest.fn() },
    $transaction: jest.fn((fn: any) => fn({ application: { create: jest.fn().mockResolvedValue({ id: 'app-1', tags: [] }) } })),
    ...overrides,
  };
}

// ─── ApplicationsService ─────────────────────────────────────────────────────

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [ApplicationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ApplicationsService);
    jest.clearAllMocks();
  });

  describe('submit', () => {
    it('throws NotFoundException if talent not found', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      await expect(service.submit('user-1', { talentId: 't1', projectId: 'p1' } as any)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if guardian does not own talent', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue({ id: 't1', guardian: { userId: 'other-user' }, dateOfBirth: new Date() });
      await expect(service.submit('user-1', { talentId: 't1', projectId: 'p1' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if project not published', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue({ id: 't1', guardian: { userId: 'user-1' }, dateOfBirth: new Date() });
      prisma.castingProject.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT', roles: [], applicationEnd: null });
      await expect(service.submit('user-1', { talentId: 't1', projectId: 'p1' } as any)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on duplicate application', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue({ id: 't1', guardian: { userId: 'user-1' }, dateOfBirth: new Date() });
      prisma.castingProject.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED', roles: [], applicationEnd: null });
      prisma.application.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.submit('user-1', { talentId: 't1', projectId: 'p1' } as any)).rejects.toThrow(ConflictException);
    });
  });
});

// ─── PaymentsService ─────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PaymentsService);
    jest.clearAllMocks();
  });

  it('throws NotFoundException for unknown plan', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    await expect(service.createSubscription('u1', { planId: 'bad' })).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException if already subscribed', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p1', isActive: true, price: 9.99, currency: 'USD', interval: 'month' });
    prisma.subscription.findFirst.mockResolvedValue({ id: 'existing', status: 'ACTIVE' });
    await expect(service.createSubscription('u1', { planId: 'p1' })).rejects.toThrow(BadRequestException);
  });

  it('checkEntitlement returns false when no subscription', async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    const result = await service.checkEntitlement('u1', 'unlimited_castings');
    expect(result).toBe(false);
  });

  it('checkEntitlement returns true when feature present in plan', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: 's1', status: 'ACTIVE',
      plan: { features: { unlimited_castings: true } },
    });
    const result = await service.checkEntitlement('u1', 'unlimited_castings');
    expect(result).toBe(true);
  });
});

// ─── NotificationsService ─────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  it('creates in-app notification via send()', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'n1' });

    await service.send({ userId: 'u1', type: 'SYSTEM' as any, title: 'Test', body: 'Body' });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', title: 'Test' }) }),
    );
  });

  it('markAllRead updates all unread notifications', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });
    await service.markAllRead('u1');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', readAt: null } }),
    );
  });
});
