import { Controller, Post, Body, Param } from '@nestjs/common';
import { MessagingService } from './messaging.service';

interface SendMessageDto {
  text: string;
}

interface BulkMessageDto {
  leadIds: string[];
  text: string;
  delayMin?: number;
  delayMax?: number;
}

@Controller('leads')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Post(':id/message')
  async sendMessage(@Param('id') id: string, @Body() body: SendMessageDto) {
    return this.messagingService.sendMessage({ leadId: id, text: body.text });
  }

  @Post('bulk-message')
  async sendBulk(@Body() body: BulkMessageDto) {
    return this.messagingService.sendBulk(body);
  }
}
