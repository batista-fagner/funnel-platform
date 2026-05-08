import { Controller, Post, Param, Body } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';

@Controller('leads')
export class EnrichmentController {
  constructor(private enrichmentService: EnrichmentService) {}

  @Post(':id/enrich')
  async enrich(@Param('id') id: string) {
    return this.enrichmentService.enrichLeadFromInstagram(id);
  }

  @Post(':id/followup')
  async generateFollowup(@Param('id') id: string) {
    return this.enrichmentService.generateFollowupForLead(id);
  }

  @Post(':id/send-followup')
  async sendFollowup(@Param('id') id: string, @Body() body: { message: string }) {
    return this.enrichmentService.sendFollowupMessage(id, body.message);
  }
}
