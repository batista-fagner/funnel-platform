import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LeadsModule } from '../leads/leads.module';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';

@Module({
  imports: [HttpModule, LeadsModule],
  providers: [MessagingService],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
