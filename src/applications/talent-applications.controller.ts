import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { ListApplicationsQueryDto } from './applications.dto';
import { JwtAuthGuard, Roles } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Talents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('talents')
export class TalentApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get(':talentId/applications')
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({ summary: 'List applications for a specific talent' })
  listForTalent(
    @Param('talentId') talentId: string,
    @CurrentUser() user: User,
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.listForTalent(talentId, user.id, query);
  }
}
