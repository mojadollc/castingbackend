import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ShortlistsService } from './shortlists.service';
import { CreateShortlistDto, AddTalentToShortlistDto, ShortlistMessageDto } from './shortlists.dto';
import { JwtAuthGuard, Roles } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

const PROF_ROLES = [UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR];

@ApiTags('Shortlists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(...PROF_ROLES)
@Controller()
export class ShortlistsController {
  constructor(private readonly shortlistsService: ShortlistsService) {}

  @Post('projects/:projectId/shortlists')
  @ApiOperation({ summary: 'Create a shortlist for a project' })
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateShortlistDto,
  ) {
    return this.shortlistsService.create(projectId, user.id, dto);
  }

  @Get('projects/:projectId/shortlists')
  @ApiOperation({ summary: 'List all shortlists for a project' })
  listForProject(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    return this.shortlistsService.listForProject(projectId, user.id);
  }

  @Post('shortlists/:id/talents')
  @ApiOperation({ summary: 'Add a talent to a shortlist' })
  addTalent(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: AddTalentToShortlistDto,
  ) {
    return this.shortlistsService.addTalent(id, user.id, dto);
  }

  @Delete('shortlists/:id/talents/:talentId')
  @ApiOperation({ summary: 'Remove a talent from a shortlist' })
  removeTalent(
    @Param('id') id: string,
    @Param('talentId') talentId: string,
    @CurrentUser() user: User,
  ) {
    return this.shortlistsService.removeTalent(id, talentId, user.id);
  }

  @Post('shortlists/:id/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to all talents in a shortlist' })
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ShortlistMessageDto,
  ) {
    return this.shortlistsService.sendMessage(id, user.id, dto);
  }

  @Get('shortlists/:id/compare')
  @ApiOperation({ summary: 'Side-by-side comparison of all talents in a shortlist' })
  compare(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shortlistsService.compare(id, user.id);
  }

  @Get('shortlists/:id/comp-cards')
  @ApiOperation({ summary: 'Get comp cards for all talents in a shortlist' })
  getCompCards(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shortlistsService.getCompCards(id, user.id);
  }
}
