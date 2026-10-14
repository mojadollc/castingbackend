import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditionsService } from './auditions.service';
import {
  CreateAuditionDto, UpdateAuditionDto, SubmitSelfTapeDto, ScheduleCallbackDto,
} from './auditions.dto';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Auditions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auditions')
export class AuditionsController {
  constructor(private readonly auditionsService: AuditionsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule an audition for an application' })
  create(@CurrentUser() user: User, @Body() dto: CreateAuditionDto) {
    return this.auditionsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List auditions (professional: their projects; guardian: their talents)' })
  list(@CurrentUser() user: User) {
    return this.auditionsService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audition details' })
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.auditionsService.getOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update audition details (professional only)' })
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateAuditionDto) {
    return this.auditionsService.update(id, user.id, dto);
  }

  @Post(':id/self-tape')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guardian submits self-tape video URL' })
  submitSelfTape(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: SubmitSelfTapeDto) {
    return this.auditionsService.submitSelfTape(id, user.id, dto);
  }

  @Post(':id/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule a callback audition (professional only, after completion)' })
  scheduleCallback(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ScheduleCallbackDto,
  ) {
    return this.auditionsService.scheduleCallback(id, user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark audition as completed (professional only)' })
  complete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('feedback') feedback?: string,
  ) {
    return this.auditionsService.complete(id, user.id, feedback);
  }
}
