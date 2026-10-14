import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TalentsService } from './talents.service';
import {
  UpdateTalentProfileDto, UpdatePhotoDto, AddVideoDto, AddAudioDto,
  SetSkillsDto, SetLanguagesDto, CreateCreditDto, UpdateCreditDto,
} from './talents.dto';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Talents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('talents')
export class TalentsController {
  constructor(private readonly talentsService: TalentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get talent profile (fields filtered by viewer role)' })
  getProfile(@Param('id') id: string, @CurrentUser() user: User) {
    return this.talentsService.getProfile(id, user?.role, user?.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update talent profile' })
  updateProfile(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateTalentProfileDto) {
    return this.talentsService.updateProfile(id, user.id, dto);
  }

  // Photos
  @Get(':id/photos')
  getPhotos(@Param('id') id: string) {
    return this.talentsService.getPhotos(id);
  }

  @Post(':id/photos')
  addPhoto(@Param('id') id: string, @CurrentUser() user: User, @Body('mediaFileId') mediaFileId: string) {
    return this.talentsService.addPhoto(id, user.id, mediaFileId);
  }

  @Patch(':id/photos/:photoId')
  updatePhoto(@Param('id') id: string, @CurrentUser() user: User, @Param('photoId') photoId: string, @Body() dto: UpdatePhotoDto) {
    return this.talentsService.updatePhoto(id, user.id, photoId, dto);
  }

  @Delete(':id/photos/:photoId')
  deletePhoto(@Param('id') id: string, @CurrentUser() user: User, @Param('photoId') photoId: string) {
    return this.talentsService.deletePhoto(id, user.id, photoId);
  }

  // Videos
  @Get(':id/videos')
  getVideos(@Param('id') id: string) {
    return this.talentsService.getVideos(id);
  }

  @Post(':id/videos')
  addVideo(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: AddVideoDto) {
    return this.talentsService.addVideo(id, user.id, dto);
  }

  @Delete(':id/videos/:videoId')
  deleteVideo(@Param('id') id: string, @CurrentUser() user: User, @Param('videoId') videoId: string) {
    return this.talentsService.deleteVideo(id, user.id, videoId);
  }

  // Audio
  @Get(':id/audio')
  getAudio(@Param('id') id: string) {
    return this.talentsService.getAudio(id);
  }

  @Post(':id/audio')
  addAudio(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: AddAudioDto) {
    return this.talentsService.addAudio(id, user.id, dto);
  }

  // Skills
  @Get(':id/skills')
  getSkills(@Param('id') id: string) {
    return this.talentsService.getSkills(id);
  }

  @Patch(':id/skills')
  setSkills(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: SetSkillsDto) {
    return this.talentsService.setSkills(id, user.id, dto);
  }

  // Languages
  @Get(':id/languages')
  getLanguages(@Param('id') id: string) {
    return this.talentsService.getLanguages(id);
  }

  @Patch(':id/languages')
  setLanguages(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: SetLanguagesDto) {
    return this.talentsService.setLanguages(id, user.id, dto);
  }

  // Credits
  @Get(':id/credits')
  getCredits(@Param('id') id: string) {
    return this.talentsService.getCredits(id);
  }

  @Post(':id/credits')
  createCredit(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: CreateCreditDto) {
    return this.talentsService.createCredit(id, user.id, dto);
  }

  @Patch(':id/credits/:creditId')
  updateCredit(@Param('id') id: string, @CurrentUser() user: User, @Param('creditId') creditId: string, @Body() dto: UpdateCreditDto) {
    return this.talentsService.updateCredit(id, user.id, creditId, dto);
  }

  @Delete(':id/credits/:creditId')
  deleteCredit(@Param('id') id: string, @CurrentUser() user: User, @Param('creditId') creditId: string) {
    return this.talentsService.deleteCredit(id, user.id, creditId);
  }

  // Completion & Comp Card
  @Get(':id/completion')
  getCompletion(@Param('id') id: string) {
    return this.talentsService.getCompletion(id);
  }

  @Get(':id/comp-card')
  getCompCard(@Param('id') id: string) {
    return this.talentsService.getCompCard(id);
  }
}
