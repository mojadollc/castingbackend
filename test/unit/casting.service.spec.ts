import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CastingService } from '../../src/casting/casting.service';
import { PrismaService } from '../../src/database/prisma.service';

const PRO_USER_ID = 'pro-user-1';
const PRO_PROFILE_ID = 'pro-profile-1';
const PROJECT_ID = 'project-1';

const mockProject = {
  id: PROJECT_ID,
  title: 'Test Film',
  status: 'DRAFT',
  professional: { userId: PRO_USER_ID },
  professionalId: PRO_PROFILE_ID,
};

const mockPrisma = {
  castingProject: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  castingRole: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
  },
  professionalProfile: { findUnique: jest.fn() },
};

describe('CastingService', () => {
  let service: CastingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CastingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CastingService>(CastingService);
    jest.clearAllMocks();
  });

  describe('submit', () => {
    it('throws BadRequestException if project is not DRAFT', async () => {
      mockPrisma.castingProject.findUnique.mockResolvedValue({ ...mockProject, status: 'PUBLISHED' });
      await expect(service.submit(PROJECT_ID, PRO_USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if no roles exist', async () => {
      mockPrisma.castingProject.findUnique.mockResolvedValue(mockProject);
      mockPrisma.castingRole.count.mockResolvedValue(0);
      await expect(service.submit(PROJECT_ID, PRO_USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('transitions to PENDING_REVIEW when valid', async () => {
      mockPrisma.castingProject.findUnique.mockResolvedValue(mockProject);
      mockPrisma.castingRole.count.mockResolvedValue(2);
      mockPrisma.castingProject.update.mockResolvedValue({ ...mockProject, status: 'PENDING_REVIEW' });

      const result = await service.submit(PROJECT_ID, PRO_USER_ID);
      expect(mockPrisma.castingProject.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_REVIEW' }) }),
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException for non-owner', async () => {
      mockPrisma.castingProject.findUnique.mockResolvedValue(mockProject);
      await expect(service.update(PROJECT_ID, 'other-user', { title: 'Hack' })).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when editing PUBLISHED project', async () => {
      mockPrisma.castingProject.findUnique.mockResolvedValue({ ...mockProject, status: 'PUBLISHED' });
      await expect(service.update(PROJECT_ID, PRO_USER_ID, { title: 'New' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('close', () => {
    it('throws BadRequestException when closing DRAFT project', async () => {
      mockPrisma.castingProject.findUnique.mockResolvedValue(mockProject);
      await expect(service.close(PROJECT_ID, PRO_USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('closes PUBLISHED project', async () => {
      mockPrisma.castingProject.findUnique.mockResolvedValue({ ...mockProject, status: 'PUBLISHED' });
      mockPrisma.castingProject.update.mockResolvedValue({ ...mockProject, status: 'CLOSED' });
      await service.close(PROJECT_ID, PRO_USER_ID);
      expect(mockPrisma.castingProject.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CLOSED' } }),
      );
    });
  });
});
