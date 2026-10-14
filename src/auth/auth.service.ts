import {
  Injectable, BadRequestException, UnauthorizedException,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto,
  ChangePasswordDto, VerifyEmailDto, SendOtpDto, VerifyOtpDto,
} from './auth.dto';
import { UserRole, VerificationType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Create profile based on role
    if (dto.role === UserRole.GUARDIAN) {
      await this.prisma.guardianProfile.create({
        data: { userId: user.id, firstName: dto.firstName, lastName: dto.lastName },
      });
    } else if (dto.role === UserRole.CASTING_PROFESSIONAL) {
      await this.prisma.professionalProfile.create({
        data: { userId: user.id, firstName: dto.firstName, lastName: dto.lastName },
      });
    }

    const verificationToken = await this.createVerification(user.id, VerificationType.EMAIL);
    // TODO: send email with verificationToken

    return { message: 'Registration successful. Please verify your email.', userId: user.id };
  }

  async login(dto: LoginDto, deviceInfo?: any, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is not accessible');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveSession(user.id, tokens.refreshToken, deviceInfo, ipAddress);

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.userSession.deleteMany({
      where: { userId, refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.deleteMany({ where: { userId } });
    return { message: 'All sessions terminated' };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.userSession.findUnique({ where: { refreshToken } });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If the email exists, a reset link has been sent.' };

    const token = await this.createVerification(user.id, VerificationType.PASSWORD_RESET);
    // TODO: send email with token
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { token: dto.token },
    });
    if (!verification || verification.type !== 'PASSWORD_RESET' || verification.usedAt) {
      throw new BadRequestException('Invalid or expired token');
    }
    if (verification.expiresAt < new Date()) throw new BadRequestException('Token expired');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { passwordHash },
    });
    await this.prisma.userVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });
    await this.prisma.userSession.deleteMany({ where: { userId: verification.userId } });

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.userSession.deleteMany({ where: { userId } });

    return { message: 'Password changed successfully' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { token: dto.token },
    });
    if (!verification || verification.type !== 'EMAIL' || verification.usedAt) {
      throw new BadRequestException('Invalid or expired token');
    }
    if (verification.expiresAt < new Date()) throw new BadRequestException('Token expired');

    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });
    await this.prisma.userVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Email verified successfully' };
  }

  async sendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerifiedAt) throw new BadRequestException('Email already verified');

    const token = await this.createVerification(userId, VerificationType.EMAIL);
    // TODO: send email
    return { message: 'Verification email sent' };
  }

  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresIn = this.config.get<number>('OTP_EXPIRES_IN', 600);

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException('Phone number not found');

    await this.prisma.userVerification.create({
      data: {
        userId: user.id,
        type: VerificationType.PHONE,
        token: otp,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });
    // TODO: send SMS via Twilio
    return { message: 'OTP sent' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException('Phone number not found');

    const verification = await this.prisma.userVerification.findFirst({
      where: { userId: user.id, type: 'PHONE', token: dto.otp, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { phoneVerifiedAt: new Date() },
    });
    await this.prisma.userVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Phone verified successfully' };
  }

  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
      select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, expiresAt: true },
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.userSession.delete({ where: { id: sessionId } });
    return { message: 'Session terminated' };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveSession(
    userId: string,
    refreshToken: string,
    deviceInfo?: any,
    ipAddress?: string,
  ) {
    await this.prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async createVerification(userId: string, type: VerificationType): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.userVerification.create({
      data: {
        userId,
        type,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return token;
  }
}
