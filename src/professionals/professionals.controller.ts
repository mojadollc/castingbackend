import {
  Controller, Get, Post, Patch, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { UpdateProfessionalProfileDto, UploadDocumentDto } from './professionals.dto';
import { JwtAuthGuard, Roles } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Professionals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.CASTING_PROFESSIONAL)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get professional profile' })
  getProfile(@CurrentUser() user: User) {
    return this.professionalsService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update professional profile' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfessionalProfileDto) {
    return this.professionalsService.updateProfile(user.id, dto);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Attach an uploaded media file as a verification document' })
  uploadDocument(@CurrentUser() user: User, @Body() dto: UploadDocumentDto) {
    return this.professionalsService.uploadDocument(user.id, dto);
  }

  @Get('verification')
  @ApiOperation({ summary: 'Get verification status and document checklist' })
  getVerificationStatus(@CurrentUser() user: User) {
    return this.professionalsService.getVerificationStatus(user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get professional dashboard with project and application stats' })
  getDashboard(@CurrentUser() user: User) {
    return this.professionalsService.getDashboard(user.id);
  }
}
