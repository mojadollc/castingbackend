import { Injectable } from '@nestjs/common';
import { AiProvider } from './ai.provider';
import { PhotoAnalysisResult } from './ai.dto';

/**
 * StubAiProvider — used until a real AI vendor (OpenAI Vision, AWS Rekognition, etc.) is integrated.
 * Replace this class with a real implementation and swap the provider token in AiModule.
 *
 * To integrate OpenAI Vision:
 *   1. npm install openai
 *   2. Create OpenAiProvider implements AiProvider
 *   3. Replace useClass: StubAiProvider with useClass: OpenAiProvider in AiModule
 */
@Injectable()
export class StubAiProvider implements AiProvider {
  async analyzePhoto(imageUrl: string): Promise<PhotoAnalysisResult> {
    // Deterministic stub — scores based on URL hash so tests are repeatable
    const hash = imageUrl.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const base = 60 + (hash % 30); // 60–89

    const lighting = Math.min(100, base + 5);
    const clarity = Math.min(100, base + 3);
    const framing = Math.min(100, base - 2);
    const faceVisibility = Math.min(100, base + 8);
    const background = Math.min(100, base - 5);
    const overallScore = Math.round((lighting + clarity + framing + faceVisibility + background) / 5);

    const recommendations: string[] = [];
    if (lighting < 75) recommendations.push('Use brighter natural lighting');
    if (background < 70) recommendations.push('Use a simpler, neutral background');
    if (framing < 70) recommendations.push('Ensure the face fills at least 60% of the frame');
    if (faceVisibility < 80) recommendations.push('Ensure the face is fully visible and unobstructed');
    if (clarity < 75) recommendations.push('Use a higher resolution camera or reduce motion blur');

    const suitability: PhotoAnalysisResult['suitability'] =
      overallScore >= 85 ? 'excellent'
      : overallScore >= 70 ? 'good'
      : overallScore >= 55 ? 'fair'
      : 'poor';

    return { lighting, clarity, framing, faceVisibility, background, overallScore, recommendations, suitability };
  }
}
