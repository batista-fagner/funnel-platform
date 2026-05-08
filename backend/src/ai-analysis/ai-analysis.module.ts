import { Module } from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';

@Module({
  providers: [AiAnalysisService],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
