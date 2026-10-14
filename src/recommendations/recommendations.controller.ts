import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly svc: RecommendationsService) {}

  @Get('castings')
  @ApiOperation({ summary: 'Recommended casting calls for my talents (guardian)' })
  recommendCastings(@CurrentUser('id') userId: string) {
    return this.svc.recommendCastings(userId);
  }

  @Get('talents')
  @ApiOperation({ summary: 'Recommended talents for a role (professional)' })
  recommendTalents(@CurrentUser('id') userId: string, @Query('roleId') roleId: string) {
    return this.svc.recommendTalents(userId, roleId);
  }
}
