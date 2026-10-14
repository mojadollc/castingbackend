import { PhotoAnalysisResult } from './ai.dto';

/**
 * Implement this interface to swap AI providers (OpenAI, AWS Rekognition, Google Vision, etc.)
 * without touching the rest of the application.
 */
export interface AiProvider {
  analyzePhoto(imageUrl: string): Promise<PhotoAnalysisResult>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
