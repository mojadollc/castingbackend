import {
  Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, RespondInvitationDto } from './invitations.dto';
import { JwtAuthGuard, Roles } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.ORGANIZATION_ADMIN, UserRole.CASTING_DIRECTOR)
  @ApiOperation({ summary: 'Send an invitation to a talent (Professional → Guardian)' })
  create(@CurrentUser() user: User, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sent and received invitations' })
  list(@CurrentUser() user: User) {
    return this.invitationsService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invitation details' })
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.invitationsService.getOne(id, user.id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: 'Accept an invitation' })
  accept(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: RespondInvitationDto) {
    return this.invitationsService.accept(id, user.id, dto);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: 'Decline an invitation' })
  decline(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: RespondInvitationDto) {
    return this.invitationsService.decline(id, user.id, dto);
  }
}
