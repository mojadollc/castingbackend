import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/database/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  guardianProfile: { create: jest.fn() },
  professionalProfile: { create: jest.fn() },
  userVerification: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  userSession: { create: jest.fn(), deleteMany: jest.fn() },
};
const mockJwt = { signAsync: jest.fn().mockResolvedValue('mock-token'), verify: jest.fn() };
const mockConfig = { get: jest.fn((key: string, def?: any) => def ?? null) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(
        service.register({ email: 'a@b.com', password: 'P@ss1', firstName: 'A', lastName: 'B', role: 'GUARDIAN' as any }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates guardian profile for GUARDIAN role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'u1', role: 'GUARDIAN' });
      mockPrisma.guardianProfile.create.mockResolvedValue({});
      mockPrisma.userVerification.create.mockResolvedValue({ token: 'tok' });

      const result = await service.register({
        email: 'new@test.com', password: 'P@ss1', firstName: 'Jane', lastName: 'Doe', role: 'GUARDIAN' as any,
      });
      expect(mockPrisma.guardianProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'u1' }) }),
      );
      expect(result.message).toContain('Registration successful');
    });

    it('creates professional profile for CASTING_PROFESSIONAL role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'u2', role: 'CASTING_PROFESSIONAL' });
      mockPrisma.professionalProfile.create.mockResolvedValue({});
      mockPrisma.userVerification.create.mockResolvedValue({ token: 'tok' });

      await service.register({
        email: 'pro@test.com', password: 'P@ss1', firstName: 'John', lastName: 'Pro', role: 'CASTING_PROFESSIONAL' as any,
      });
      expect(mockPrisma.professionalProfile.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pw' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', passwordHash: await bcrypt.hash('correct', 10),
        status: 'ACTIVE', emailVerifiedAt: new Date(), role: 'GUARDIAN',
      });
      await expect(service.login({ email: 'x@x.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unverified email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', passwordHash: await bcrypt.hash('pw', 10),
        status: 'ACTIVE', emailVerifiedAt: null, role: 'GUARDIAN',
      });
      await expect(service.login({ email: 'x@x.com', password: 'pw' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for suspended user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', passwordHash: await bcrypt.hash('pw', 10),
        status: 'SUSPENDED', emailVerifiedAt: new Date(), role: 'GUARDIAN',
      });
      await expect(service.login({ email: 'x@x.com', password: 'pw' })).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', passwordHash: await bcrypt.hash('pw', 10),
        status: 'ACTIVE', emailVerifiedAt: new Date(), role: 'GUARDIAN',
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await service.login({ email: 'x@x.com', password: 'pw' });
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });
});
