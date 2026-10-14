import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SafetyService } from '../admin/safety.service';
import { CreateReportDto, AddEvidenceDto, CreateAppealDto } from '../admin/safety.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly safety: SafetyService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a report' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReportDto) {
    return this.safety.createReport(userId, dto);
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Add evidence to a report you submitted' })
  addEvidence(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddEvidenceDto,
  ) {
    return this.safety.addEvidence(id, userId, dto);
  }

  @Post('appeals')
  @ApiOperation({ summary: 'Submit an appeal against a moderation action' })
  createAppeal(@CurrentUser('id') userId: string, @Body() dto: CreateAppealDto) {
    return this.safety.createAppeal(userId, dto);
  }
}
