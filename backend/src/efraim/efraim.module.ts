import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EfraimService } from './efraim.service';
import { EfraimController } from './efraim.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [HttpModule, LeadsModule],
  controllers: [EfraimController],
  providers: [EfraimService],
})
export class EfraimModule {}
