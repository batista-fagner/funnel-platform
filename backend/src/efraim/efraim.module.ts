import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EfraimService } from './efraim.service';
import { EfraimController } from './efraim.controller';
import { GroupJoinService } from './group-join.service';
import { LeadsModule } from '../leads/leads.module';
import { MessagingModule } from '../messaging/messaging.module';
import { FacebookModule } from '../facebook/facebook.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [HttpModule, LeadsModule, MessagingModule, FacebookModule, TrackingModule],
  controllers: [EfraimController],
  providers: [EfraimService, GroupJoinService],
})
export class EfraimModule {}
