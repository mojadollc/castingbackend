import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PhotoAnalysisDto {
  @ApiProperty({ description: 'Public URL or S3 key of the photo to analyze' })
  @IsString()
  imageUrl: string;
}

export interface PhotoAnalysisResult {
  lighting: number;
  clarity: number;
  framing: number;
  faceVisibility: number;
  background: number;
  overallScore: number;
  recommendations: string[];
  suitability: 'excellent' | 'good' | 'fair' | 'poor';
}
