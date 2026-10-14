import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { PhotoAnalysisDto } from './ai.dto';

@ApiTags('AI Services')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly svc: AiService) {}

  @Post('photo-analysis')
  @ApiOperation({
    summary: 'Analyze a headshot photo (advisory)',
    description: 'Returns lighting, clarity, framing, face visibility and background scores with improvement recommendations. Advisory only — not used in casting decisions.',
  })
  analyzePhoto(@Body() dto: PhotoAnalysisDto) {
    return this.svc.analyzePhoto(dto);
  }
}
