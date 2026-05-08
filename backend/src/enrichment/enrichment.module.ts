import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LeadsModule } from '../leads/leads.module';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { MessagingModule } from '../messaging/messaging.module';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentController } from './enrichment.controller';
import { InstagramProxyController } from './instagram-proxy.controller';

@Module({
  imports: [HttpModule, LeadsModule, AiAnalysisModule, MessagingModule],
  providers: [EnrichmentService],
  controllers: [EnrichmentController, InstagramProxyController],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
