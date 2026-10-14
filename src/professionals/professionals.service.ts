import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfessionalProfileDto, UploadDocumentDto } from './professionals.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Profile ───────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        documents: {
          include: { mediaFile: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!profile) throw new NotFoundException('Professional profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfessionalProfileDto) {
    await this.getProfile(userId);
    return this.prisma.professionalProfile.update({
      where: { userId },
      data: dto,
    });
  }

  // ─── Documents ─────────────────────────────────────────────────────────────

  async uploadDocument(userId: string, dto: UploadDocumentDto) {
    const profile = await this.getProfile(userId);

    // Verify the media file belongs to this user
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: dto.mediaFileId },
    });
    if (!mediaFile) throw new NotFoundException('Media file not found');
    if (mediaFile.uploadedBy !== userId) throw new ForbiddenException();

    return this.prisma.professionalDocument.create({
      data: {
        professionalId: profile.id,
        mediaFileId: dto.mediaFileId,
        docType: dto.docType,
      },
      include: { mediaFile: true },
    });
  }

  // ─── Verification Status ───────────────────────────────────────────────────

  async getVerificationStatus(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        documents: {
          select: { id: true, docType: true, verifiedAt: true, createdAt: true },
        },
      },
    });
    if (!profile) throw new NotFoundException('Professional profile not found');

    const requiredDocs = ['ID_CARD'];
    const uploadedTypes = profile.documents.map((d) => d.docType);
    const missingDocs = requiredDocs.filter((d) => !uploadedTypes.includes(d));
    const verifiedDocs = profile.documents.filter((d) => d.verifiedAt !== null);

    return {
      isVerified: profile.isVerified,
      documentsUploaded: profile.documents.length,
      documentsVerified: verifiedDocs.length,
      missingDocuments: missingDocs,
      documents: profile.documents,
      verificationNote: profile.isVerified
        ? 'Your account is verified'
        : missingDocs.length > 0
          ? `Please upload: ${missingDocs.join(', ')}`
          : 'Documents submitted and under review',
    };
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Professional profile not found');

    const [projects, recentApplications, totalApplications] = await Promise.all([
      this.prisma.castingProject.findMany({
        where: { professionalId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: { select: { applications: true, roles: true } },
        },
      }),
      this.prisma.application.findMany({
        where: {
          project: { professionalId: profile.id },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          talent: { select: { id: true, firstName: true, lastName: true, headshot: true } },
          project: { select: { id: true, title: true } },
        },
      }),
      this.prisma.application.count({
        where: { project: { professionalId: profile.id } },
      }),
    ]);

    const projectStats = {
      total: projects.length,
      draft: projects.filter((p) => p.status === 'DRAFT').length,
      published: projects.filter((p) => p.status === 'PUBLISHED').length,
      closed: projects.filter((p) => p.status === 'CLOSED').length,
    };

    return {
      profile: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        companyName: profile.companyName,
        isVerified: profile.isVerified,
      },
      projectStats,
      recentProjects: projects.slice(0, 5),
      recentApplications,
      totalApplications,
    };
  }
}
