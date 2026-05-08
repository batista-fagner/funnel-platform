import { Controller, Get, Param, Query, Delete, Patch, Body } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { FacebookService } from '../facebook/facebook.service';

@Controller('leads')
export class LeadsController {
  constructor(
    private leadsService: LeadsService,
    private facebookService: FacebookService,
  ) {}

  @Get()
  async findAll(
    @Query('campaignId') campaignId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('source') source?: 'all' | 'ig_dm' | 'paid',
  ) {
    return this.leadsService.findAll({
      campaignId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 6,
      source: source || 'all',
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Patch(':id/convert')
  async convert(@Param('id') id: string, @Body() body: { value?: number }) {
    const lead = await this.leadsService.markAsConverted(id);
    this.facebookService.sendPurchaseEvent(lead, body.value ?? 3000).catch(() => null);
    return lead;
  }

  @Delete('__clear-all__')
  async clearAll() {
    return this.leadsService.clearAll();
  }
}
