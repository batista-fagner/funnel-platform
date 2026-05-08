import { Controller, Post, Param, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { FormsService } from './forms.service';

interface SubmitFormDto {
  name: string;
  email?: string;
  phone: string;
  instagram?: string;
  responses?: any;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  fbclid?: string;
}

interface CreateFormDto {
  name: string;
  fields: any[];
  campaignId?: string;
  thankYouUrl?: string;
}

interface CaptureDto {
  name: string;
  phone: string;
  email?: string;
  instagram?: string;
  revenue?: string;
  fbclid?: string;
  clickId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  fbp?: string;
  userAgent?: string;
}

@Controller('forms')
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Post()
  async create(@Body() body: CreateFormDto) {
    return this.formsService.create(body);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() body: SubmitFormDto) {
    return this.formsService.submit(id, body);
  }

  @Post('capture')
  async capture(@Body() body: CaptureDto, @Req() req: Request) {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    return this.formsService.capture({ ...body, clientIp });
  }
}
