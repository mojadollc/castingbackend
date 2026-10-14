import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from './ai.provider';
import { PhotoAnalysisDto } from './ai.dto';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  async analyzePhoto(dto: PhotoAnalysisDto) {
    const lower = dto.imageUrl.toLowerCase();
    const allowed = ALLOWED_EXTENSIONS.some((ext) => lower.includes(ext));
    if (!allowed) {
      throw new BadRequestException('Only JPEG, PNG and WebP images are supported');
    }

    const result = await this.provider.analyzePhoto(dto.imageUrl);

    return {
      ...result,
      advisory: true,
      disclaimer:
        'This analysis is advisory only. Scores are suggestions to help improve your headshot — they are not used in any casting decisions.',
    };
  }
}
