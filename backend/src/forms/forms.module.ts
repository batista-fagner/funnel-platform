import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from '../common/entities/form.entity';
import { LeadsModule } from '../leads/leads.module';
import { EnrichmentModule } from '../enrichment/enrichment.module';
import { FacebookModule } from '../facebook/facebook.module';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Form]), LeadsModule, EnrichmentModule, FacebookModule],
  providers: [FormsService],
  controllers: [FormsController],
})
export class FormsModule {}
