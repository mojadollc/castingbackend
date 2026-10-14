import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TalentsService } from '../../src/talents/talents.service';
import { CastingService } from '../../src/casting/casting.service';
import { ApplicationsService } from '../../src/applications/applications.service';
import { PrismaService } from '../../src/database/prisma.service';
import { filterTalentProfile } from '../../src/common/utils/talent-profile-view';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTalentPrisma(guardianUserId: string) {
  return {
    talentProfile: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'talent-1',
        firstName: 'Emma',
        lastName: 'Smith',
        dateOfBirth: new Date('2015-06-15'),
        gender: 'FEMALE',
        guardian: { userId: guardianUserId },
        photos: [], videos: [], skills: [], languages: [], credits: [], socialLinks: [], country: null,
        profileCompletion: 70, isAvailable: true,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    talentPhoto: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findMany: jest.fn() },
    talentSkill: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    talentLanguage: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    talentCredit: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    talentVideo: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    talentAudio: { findMany: jest.fn(), create: jest.fn() },
  };
}

// ─── SEC-01: Guardian cannot access another guardian's talent ─────────────────

describe('SEC-01: Guardian cannot modify another guardian\'s talent', () => {
  let service: TalentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [TalentsService, { provide: PrismaService, useValue: makeTalentPrisma('guardian-A') }],
    }).compile();
    service = module.get(TalentsService);
  });

  it('throws ForbiddenException when guardian-B tries to update guardian-A\'s talent', async () => {
    await expect(service.updateProfile('talent-1', 'guardian-B', { bio: 'hacked' })).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when guardian-B tries to add photo to guardian-A\'s talent', async () => {
    await expect(service.addPhoto('talent-1', 'guardian-B', 'media-1')).rejects.toThrow(ForbiddenException);
  });
});

// ─── SEC-02: Professional cannot access private guardian data ─────────────────

describe('SEC-02: Professional sees filtered talent profile — no exact DOB', () => {
  const talent = {
    id: 'talent-1', firstName: 'Emma', lastName: 'Smith',
    dateOfBirth: new Date('2015-06-15'), gender: 'FEMALE',
    guardian: { userId: 'guardian-A' },
    photos: [], videos: [], skills: [], languages: [], credits: [], socialLinks: [], country: null,
    profileCompletion: 70, isAvailable: true,
  };

  it('professional view omits exact dateOfBirth', () => {
    const view = filterTalentProfile(talent, 'CASTING_PROFESSIONAL' as any, 'pro-user-1');
    expect(view.dateOfBirth).toBeUndefined();
    expect(view.ageRange).toBeDefined();
  });

  it('professional view shows last name initial only', () => {
    const view = filterTalentProfile(talent, 'CASTING_PROFESSIONAL' as any, 'pro-user-1');
    expect(view.lastName).toBe('S.');
    expect(view.lastName).not.toBe('Smith');
  });

  it('public view omits last name entirely', () => {
    const view = filterTalentProfile(talent, undefined, undefined);
    expect(view.lastName).toBeUndefined();
    expect(view.dateOfBirth).toBeUndefined();
  });

  it('guardian owner sees full profile including exact DOB', () => {
    const view = filterTalentProfile(talent, 'GUARDIAN' as any, 'guardian-A');
    expect(view.dateOfBirth).toBeDefined();
    expect(view.lastName).toBe('Smith');
  });

  it('admin sees full profile', () => {
    const view = filterTalentProfile(talent, 'ADMIN' as any, 'admin-1');
    expect(view.dateOfBirth).toBeDefined();
    expect(view.lastName).toBe('Smith');
  });
});

// ─── SEC-03: Casting project ownership enforcement ────────────────────────────

describe('SEC-03: Professional cannot modify another professional\'s project', () => {
  let service: CastingService;
  const ownerUserId = 'pro-owner';
  const attackerUserId = 'pro-attacker';

  beforeEach(async () => {
    const prisma = {
      castingProject: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'proj-1', status: 'DRAFT',
          professional: { userId: ownerUserId },
        }),
        update: jest.fn(), delete: jest.fn(), findMany: jest.fn(), count: jest.fn(),
      },
      castingRole: { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn(), createMany: jest.fn() },
      professionalProfile: { findUnique: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [CastingService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CastingService);
  });

  it('throws ForbiddenException when attacker tries to update project', async () => {
    await expect(service.update('proj-1', attackerUserId, { title: 'Hacked' })).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when attacker tries to delete project', async () => {
    await expect(service.remove('proj-1', attackerUserId)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when attacker tries to submit project', async () => {
    await expect(service.submit('proj-1', attackerUserId)).rejects.toThrow(ForbiddenException);
  });
});

// ─── SEC-04: Suspended user cannot create casting ─────────────────────────────

describe('SEC-04: Business rule — project state machine', () => {
  let service: CastingService;

  beforeEach(async () => {
    const prisma = {
      castingProject: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'proj-1', status: 'PUBLISHED',
          professional: { userId: 'pro-1' },
        }),
        update: jest.fn(), delete: jest.fn(), findMany: jest.fn(), count: jest.fn(),
      },
      castingRole: { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn(), createMany: jest.fn() },
      professionalProfile: { findUnique: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [CastingService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CastingService);
  });

  it('throws BadRequestException when editing PUBLISHED project', async () => {
    await expect(service.update('proj-1', 'pro-1', { title: 'New' })).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when submitting PUBLISHED project', async () => {
    await expect(service.submit('proj-1', 'pro-1')).rejects.toThrow(BadRequestException);
  });
});

// ─── SEC-05: Application ownership ───────────────────────────────────────────

describe('SEC-05: Guardian cannot apply with another guardian\'s talent', () => {
  let service: ApplicationsService;

  beforeEach(async () => {
    const prisma = {
      talentProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't1', dateOfBirth: new Date('2015-01-01'),
          guardian: { userId: 'guardian-A' },
        }),
      },
      castingProject: { findUnique: jest.fn() },
      application: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
      guardianProfile: { findUnique: jest.fn() },
      applicationStatusHistory: { createMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [ApplicationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ApplicationsService);
  });

  it('throws ForbiddenException when guardian-B submits for guardian-A\'s talent', async () => {
    await expect(
      service.submit('guardian-B', { talentId: 't1', projectId: 'p1' } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
