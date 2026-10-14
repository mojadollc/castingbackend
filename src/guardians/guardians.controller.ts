import {
  Controller, Get, Patch, Post, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GuardiansService } from './guardians.service';
import { UpdateGuardianProfileDto, CreateTalentDto, UpdateTalentDto } from './guardians.dto';
import { JwtAuthGuard, Roles } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Guardian')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.GUARDIAN)
@Controller('guardian')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get guardian profile' })
  getProfile(@CurrentUser() user: User) {
    return this.guardiansService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update guardian profile' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateGuardianProfileDto) {
    return this.guardiansService.updateProfile(user.id, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get guardian dashboard' })
  getDashboard(@CurrentUser() user: User) {
    return this.guardiansService.getDashboard(user.id);
  }

  @Get('talents')
  @ApiOperation({ summary: 'List all talent profiles' })
  getTalents(@CurrentUser() user: User) {
    return this.guardiansService.getTalents(user.id);
  }

  @Post('talents')
  @ApiOperation({ summary: 'Create a talent profile' })
  createTalent(@CurrentUser() user: User, @Body() dto: CreateTalentDto) {
    return this.guardiansService.createTalent(user.id, dto);
  }

  @Get('talents/:id')
  @ApiOperation({ summary: 'Get a talent profile' })
  getTalent(@CurrentUser() user: User, @Param('id') id: string) {
    return this.guardiansService.getTalent(user.id, id);
  }

  @Patch('talents/:id')
  @ApiOperation({ summary: 'Update a talent profile' })
  updateTalent(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateTalentDto) {
    return this.guardiansService.updateTalent(user.id, id, dto);
  }

  @Delete('talents/:id')
  @ApiOperation({ summary: 'Delete a talent profile' })
  deleteTalent(@CurrentUser() user: User, @Param('id') id: string) {
    return this.guardiansService.deleteTalent(user.id, id);
  }
}
