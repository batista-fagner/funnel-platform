import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InstagramAutomationService } from './instagram-automation.service';

@Controller('ig-auto')
export class InstagramAutomationController {
  constructor(
    private service: InstagramAutomationService,
    private config: ConfigService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/profiles')
  getProfiles(@Param('id') id: string) {
    return this.service.findConversations(id);
  }

  @Get('media')
  getMedia(@Query('after') after?: string) {
    return this.service.getRecentMedia(after);
  }

  @Post('subscribe')
  subscribeWebhook() {
    return this.service.subscribeWebhook();
  }

  @Get('webhook')
  verifyWebhook(@Query() query: any, @Res() res: any) {
    const verifyToken = this.config.get('IG_WEBHOOK_VERIFY_TOKEN');
    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken) {
      return res.status(200).send(query['hub.challenge']);
    }
    return res.status(403).send('Forbidden');
  }

  @Post('webhook')
  handleWebhook(@Body() body: any) {
    this.service.handleWebhookEvent(body).catch(() => {});
    return { status: 'ok' };
  }
}
