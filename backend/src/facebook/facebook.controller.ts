import { Controller, Get, Param } from '@nestjs/common';
import { FacebookService } from './facebook.service';

@Controller('facebook')
export class FacebookController {
  constructor(private facebookService: FacebookService) {}

  @Get('creative/:adId')
  async getAdCreative(@Param('adId') adId: string) {
    return this.facebookService.getAdCreative(adId);
  }
}
