import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { ListApplicationsQueryDto } from './applications.dto';
import { JwtAuthGuard, Roles } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

const PROFESSIONAL_ROLES = [
  UserRole.CASTING_PROFESSIONAL,
  UserRole.ORGANIZATION_ADMIN,
  UserRole.CASTING_DIRECTOR,
  UserRole.REVIEWER,
];

@ApiTags('Castings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CastingApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('castings/:castingId/applications')
  @Roles(...PROFESSIONAL_ROLES)
  @ApiOperation({ summary: 'List all applications for a casting project' })
  listForCasting(
    @Param('castingId') castingId: string,
    @CurrentUser() user: User,
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.listForCasting(castingId, user.id, query);
  }

  @Get('roles/:roleId/applications')
  @Roles(...PROFESSIONAL_ROLES)
  @ApiOperation({ summary: 'List applications for a specific role' })
  listForRole(
    @Param('roleId') roleId: string,
    @CurrentUser() user: User,
    @Query() query: ListApplicationsQueryDto,
  ) {
    return this.applicationsService.listForRole(roleId, user.id, query);
  }
}
