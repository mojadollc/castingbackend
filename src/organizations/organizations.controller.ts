import {
  Controller, Get, Post, Patch, Delete, Body, Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto,
} from './organizations.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly svc: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.svc.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization' })
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization (admin only)' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateOrganizationDto) {
    return this.svc.update(id, userId, dto);
  }

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite member (admin only)' })
  invite(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: InviteMemberDto) {
    return this.svc.inviteMember(id, userId, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members' })
  listMembers(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.listMembers(id, userId);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role (admin only)' })
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.svc.updateMember(id, memberId, userId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member (admin only)' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.removeMember(id, memberId, userId);
  }

  @Get(':id/projects')
  @ApiOperation({ summary: 'List organization projects' })
  listProjects(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.listProjects(id, userId);
  }
}
