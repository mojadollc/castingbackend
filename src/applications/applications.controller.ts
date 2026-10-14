import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import {
  SubmitApplicationDto, ListApplicationsQueryDto, UpdateApplicationStatusDto,
  AddNoteDto, AddTagsDto, BulkStatusDto, BulkTagDto, BulkMessageDto,
} from './applications.dto';
import { JwtAuthGuard, Roles } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // ─── Phase 11: Guardian / Talent ──────────────────────────────────────────

  @Post()
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: 'Submit an application for a talent' })
  submit(@CurrentUser() user: User, @Body() dto: SubmitApplicationDto) {
    return this.applicationsService.submit(user.id, dto);
  }

  @Get()
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: 'List all applications for the guardian\'s talents' })
  listForGuardian(@CurrentUser() user: User, @Query() query: ListApplicationsQueryDto) {
    return this.applicationsService.listForGuardian(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single application (guardian or professional)' })
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.getOne(id, user.id);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: 'Withdraw an application' })
  withdraw(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.withdraw(id, user.id);
  }

  // ─── Phase 12: Professional ────────────────────────────────────────────────

  @Patch(':id/status')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR, UserRole.REVIEWER)
  @ApiOperation({ summary: 'Update application status' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, user.id, dto);
  }

  @Post(':id/notes')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR, UserRole.REVIEWER)
  @ApiOperation({ summary: 'Add internal note to an application' })
  addNote(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: AddNoteDto) {
    return this.applicationsService.addNote(id, user.id, dto);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR, UserRole.REVIEWER)
  @ApiOperation({ summary: 'Add tags to an application' })
  addTags(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: AddTagsDto) {
    return this.applicationsService.addTags(id, user.id, dto);
  }

  @Post('bulk/status')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Bulk update application statuses' })
  bulkStatus(@CurrentUser() user: User, @Body() dto: BulkStatusDto) {
    return this.applicationsService.bulkUpdateStatus(user.id, dto);
  }

  @Post('bulk/tag')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Bulk tag applications' })
  bulkTag(@CurrentUser() user: User, @Body() dto: BulkTagDto) {
    return this.applicationsService.bulkTag(user.id, dto);
  }

  @Post('bulk/message')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Send a bulk message to selected applicants' })
  bulkMessage(@CurrentUser() user: User, @Body() dto: BulkMessageDto) {
    return this.applicationsService.bulkMessage(user.id, dto);
  }
}
