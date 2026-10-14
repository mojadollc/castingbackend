import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CastingService } from './casting.service';
import {
  CreateCastingDto, UpdateCastingDto, ListCastingsQueryDto,
  ExtendCastingDto, CreateRoleDto, UpdateRoleDto,
} from './casting.dto';
import { JwtAuthGuard, Roles, Public } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Castings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('castings')
export class CastingController {
  constructor(private readonly castingService: CastingService) {}

  // ─── Phase 8: Projects ─────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Create a casting project' })
  create(@CurrentUser() user: User, @Body() dto: CreateCastingDto) {
    return this.castingService.create(user.id, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List casting projects (public: published only; authenticated professional: own projects)' })
  findAll(@Query() query: ListCastingsQueryDto, @CurrentUser() user?: User) {
    return this.castingService.findAll(query, user?.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a casting project by ID' })
  findOne(@Param('id') id: string) {
    return this.castingService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Update a casting project (DRAFT or PAUSED only)' })
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateCastingDto) {
    return this.castingService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Delete a casting project (DRAFT or PAUSED only)' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.castingService.remove(id, user.id);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Submit project for moderation review' })
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.castingService.submit(id, user.id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Publish a project (from PENDING_REVIEW or PAUSED)' })
  publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.castingService.publish(id, user.id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Pause a published project' })
  pause(@Param('id') id: string, @CurrentUser() user: User) {
    return this.castingService.pause(id, user.id);
  }

  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Extend the application deadline' })
  extend(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: ExtendCastingDto) {
    return this.castingService.extend(id, user.id, dto);
  }

  @Post(':id/duplicate')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Duplicate a project as a new DRAFT' })
  duplicate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.castingService.duplicate(id, user.id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Close a project' })
  close(@Param('id') id: string, @CurrentUser() user: User) {
    return this.castingService.close(id, user.id);
  }

  // ─── Phase 9: Roles ────────────────────────────────────────────────────────

  @Post(':castingId/roles')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Add a role to a casting project' })
  createRole(
    @Param('castingId') castingId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateRoleDto,
  ) {
    return this.castingService.createRole(castingId, user.id, dto);
  }

  @Get(':castingId/roles')
  @Public()
  @ApiOperation({ summary: 'List all roles for a casting project' })
  getRoles(@Param('castingId') castingId: string) {
    return this.castingService.getRoles(castingId);
  }

  @Get(':castingId/roles/:roleId')
  @Public()
  @ApiOperation({ summary: 'Get a specific role' })
  getRole(@Param('castingId') castingId: string, @Param('roleId') roleId: string) {
    return this.castingService.getRole(castingId, roleId);
  }

  @Patch(':castingId/roles/:roleId')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Update a role' })
  updateRole(
    @Param('castingId') castingId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.castingService.updateRole(castingId, roleId, user.id, dto);
  }

  @Delete(':castingId/roles/:roleId')
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Delete a role' })
  deleteRole(
    @Param('castingId') castingId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: User,
  ) {
    return this.castingService.deleteRole(castingId, roleId, user.id);
  }

  @Post(':castingId/roles/:roleId/fill')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Mark a role as filled' })
  fillRole(
    @Param('castingId') castingId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: User,
  ) {
    return this.castingService.fillRole(castingId, roleId, user.id);
  }
}
