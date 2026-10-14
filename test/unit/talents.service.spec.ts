import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TalentsService } from '../../src/talents/talents.service';
import { PrismaService } from '../../src/database/prisma.service';

const TALENT_ID = 'talent-1';
const GUARDIAN_USER_ID = 'user-guardian-1';
const OTHER_USER_ID = 'user-other-1';

const mockTalent = {
  id: TALENT_ID,
  firstName: 'Emma',
  lastName: 'Smith',
  dateOfBirth: new Date('2015-01-01'),
  gender: 'FEMALE',
  guardian: { userId: GUARDIAN_USER_ID },
  photos: [],
  videos: [],
  skills: [],
  languages: [],
  credits: [],
  socialLinks: [],
  country: null,
  profileCompletion: 60,
  isAvailable: true,
};

const mockPrisma = {
  talentProfile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  talentPhoto: { findMany: jest.fn(), create: jest.fn(), count: jest.fn(), updateMany: jest.fn(), delete: jest.fn() },
  talentSkill: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
  talentLanguage: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
  talentCredit: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  talentVideo: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  talentAudio: { findMany: jest.fn(), create: jest.fn() },
};

describe('TalentsService', () => {
  let service: TalentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TalentsService>(TalentsService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('throws NotFoundException for unknown talent', async () => {
      mockPrisma.talentProfile.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns full profile for guardian owner', async () => {
      mockPrisma.talentProfile.findUnique.mockResolvedValue(mockTalent);
      const result = await service.getProfile(TALENT_ID, 'GUARDIAN' as any, GUARDIAN_USER_ID);
      expect(result.id).toBe(TALENT_ID);
      // Guardian sees exact dateOfBirth
      expect(result.dateOfBirth).toBeDefined();
    });

    it('returns filtered profile for professional — no exact DOB', async () => {
      mockPrisma.talentProfile.findUnique.mockResolvedValue(mockTalent);
      const result = await service.getProfile(TALENT_ID, 'CASTING_PROFESSIONAL' as any, 'pro-user-1');
      expect(result.dateOfBirth).toBeUndefined();
      expect(result.ageRange).toBeDefined();
      // Last name should be initial only
      expect(result.lastName).toBe('S.');
    });

    it('returns minimal public profile — no DOB, no last name', async () => {
      mockPrisma.talentProfile.findUnique.mockResolvedValue(mockTalent);
      const result = await service.getProfile(TALENT_ID, undefined, undefined);
      expect(result.dateOfBirth).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.ageRange).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('throws ForbiddenException when non-owner tries to update', async () => {
      mockPrisma.talentProfile.findUnique.mockResolvedValue(mockTalent);
      await expect(
        service.updateProfile(TALENT_ID, OTHER_USER_ID, { bio: 'hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates profile for owner', async () => {
      mockPrisma.talentProfile.findUnique.mockResolvedValue(mockTalent);
      mockPrisma.talentProfile.update.mockResolvedValue({ ...mockTalent, bio: 'new bio' });
      const result = await service.updateProfile(TALENT_ID, GUARDIAN_USER_ID, { bio: 'new bio' });
      expect(mockPrisma.talentProfile.update).toHaveBeenCalled();
    });
  });
});
