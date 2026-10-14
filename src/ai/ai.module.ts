import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AI_PROVIDER } from './ai.provider';
import { StubAiProvider } from './stub-ai.provider';

@Module({
  providers: [
    AiService,
    // Swap StubAiProvider for OpenAiProvider / AwsRekognitionProvider / etc. here
    { provide: AI_PROVIDER, useClass: StubAiProvider },
  ],
  controllers: [AiController],
})
export class AiModule {}
