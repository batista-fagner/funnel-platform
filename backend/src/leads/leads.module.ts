import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../common/entities/lead.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { FacebookModule } from '../facebook/facebook.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead]), FacebookModule],
  providers: [LeadsService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
