import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto, ModerationActionDto, RejectDto, RequestChangesDto } from './admin.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../auth/auth.guards';
import { UserRole, UserStatus } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  // ─── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  listUsers(
    @Query('page') page = 1,
    @Query('search') search?: string,
    @Query('status') status?: UserStatus,
  ) {
    return this.svc.listUsers(+page, search, status);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  getUser(@Param('id') id: string) {
    return this.svc.getUser(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.svc.updateUserStatus(id, dto, adminId);
  }

  @Post('users/:id/force-logout')
  @ApiOperation({ summary: 'Force logout all sessions' })
  forceLogout(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.svc.forceLogout(id, adminId);
  }

  // ─── Professionals ─────────────────────────────────────────────────────────

  @Get('professionals')
  @ApiOperation({ summary: 'List professionals' })
  listProfessionals(@Query('page') page = 1, @Query('verified') verified?: string) {
    const v = verified === undefined ? undefined : verified === 'true';
    return this.svc.listProfessionals(+page, v);
  }

  @Get('professionals/:id')
  @ApiOperation({ summary: 'Get professional details' })
  getProfessional(@Param('id') id: string) {
    return this.svc.getProfessional(id);
  }

  @Post('professionals/:id/verify')
  @ApiOperation({ summary: 'Verify professional' })
  verifyProfessional(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.svc.verifyProfessional(id, adminId);
  }

  @Post('professionals/:id/reject')
  @ApiOperation({ summary: 'Reject professional verification' })
  rejectProfessional(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.svc.rejectProfessional(id, dto, adminId);
  }

  @Post('professionals/:id/suspend')
  @ApiOperation({ summary: 'Suspend professional' })
  suspendProfessional(
    @Param('id') id: string,
    @Body() dto: ModerationActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.svc.suspendProfessional(id, dto, adminId);
  }

  // ─── Casting Moderation ────────────────────────────────────────────────────

  @Get('castings/moderation')
  @ApiOperation({ summary: 'List projects pending review' })
  listModerationQueue(@Query('page') page = 1) {
    return this.svc.listModerationQueue(+page);
  }

  @Get('castings/:id')
  @ApiOperation({ summary: 'Get casting project for review' })
  getCasting(@Param('id') id: string) {
    return this.svc.getCasting(id);
  }

  @Post('castings/:id/approve')
  @ApiOperation({ summary: 'Approve and publish casting' })
  approveCasting(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.svc.approveCasting(id, adminId);
  }

  @Post('castings/:id/reject')
  @ApiOperation({ summary: 'Reject casting' })
  rejectCasting(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.svc.rejectCasting(id, dto, adminId);
  }

  @Post('castings/:id/request-changes')
  @ApiOperation({ summary: 'Request changes to casting' })
  requestChanges(
    @Param('id') id: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.svc.requestCastingChanges(id, dto, adminId);
  }

  @Post('castings/:id/unpublish')
  @ApiOperation({ summary: 'Unpublish a live casting' })
  unpublish(
    @Param('id') id: string,
    @Body() dto: ModerationActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.svc.unpublishCasting(id, dto, adminId);
  }
}
