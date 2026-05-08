import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../common/entities/form.entity';
import { LeadsService } from '../leads/leads.service';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { FacebookService } from '../facebook/facebook.service';
import { ScoringEngine, FormResponses } from './scoring.engine';

interface SubmitFormDto {
  name: string;
  email?: string;
  phone: string;
  instagram?: string;
  responses?: FormResponses;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  fbclid?: string;
}

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);
  private scoringEngine = new ScoringEngine();

  constructor(
    @InjectRepository(Form)
    private formsRepo: Repository<Form>,
    private leadsService: LeadsService,
    private enrichmentService: EnrichmentService,
    private facebookService: FacebookService,
  ) {}

  async findById(id: string): Promise<Form> {
    const form = await this.formsRepo.findOne({ where: { id } });
    if (!form) throw new NotFoundException(`Formulário ${id} não encontrado`);
    return form;
  }

  async create(dto: any): Promise<Form> {
    const form = this.formsRepo.create({
      name: dto.name,
      fields: dto.fields,
      campaignId: dto.campaignId,
      thankYouUrl: dto.thankYouUrl,
    });
    return this.formsRepo.save(form);
  }

  async capture(dto: { name: string; phone: string; email?: string; instagram?: string; revenue?: string; fbclid?: string; clickId?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; fbp?: string; userAgent?: string; clientIp?: string }): Promise<{ success: boolean; leadId: string }> {
    const lead = await this.leadsService.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email || undefined,
      instagram: dto.instagram,
      status: 'novo',
      score: 0,
      utmSource: dto.utmSource || 'leadscomia',
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      utmContent: dto.utmContent,
      fbclid: dto.fbclid,
      clickId: dto.clickId,
      revenueRange: dto.revenue,
    });

    if (dto.instagram) {
      this.enrichmentService.enrichLeadFromInstagram(lead.id).catch(err =>
        this.logger.error(`Erro ao enriquecer lead capturado: ${err.message}`),
      );
    }

    this.facebookService.sendLeadEvent(lead, { fbp: dto.fbp, userAgent: dto.userAgent, clientIp: dto.clientIp }).catch(err =>
      this.logger.error(`Erro ao enviar Lead event ao Facebook: ${err.message}`),
    );

    this.logger.log(`Lead capturado via leadscomia: ${lead.id} - ${lead.name}`);
    return { success: true, leadId: lead.id };
  }

  async submit(formId: string, dto: SubmitFormDto): Promise<{ success: boolean; leadId: string }> {
    await this.findById(formId);

    if (!dto.phone) throw new BadRequestException('Telefone é obrigatório');

    const { score, classification } = this.scoringEngine.score(dto.responses || {});

    const lead = await this.leadsService.create({
      campaignId: formId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      instagram: dto.instagram,
      score,
      classification,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      utmContent: dto.utmContent,
      fbclid: dto.fbclid,
      status: 'novo',
    });

    if (dto.instagram) {
      this.enrichmentService.enrichLeadFromInstagram(lead.id).catch(err =>
        this.logger.error(`Erro ao enriquecer lead ${lead.id}: ${err.message}`),
      );
    }

    this.facebookService.sendLeadEvent(lead).catch(err =>
      this.logger.error(`Erro ao enviar Lead event ao Facebook: ${err.message}`),
    );

    this.logger.log(`Form ${formId} submetido - Lead criado: ${lead.id}`);
    return { success: true, leadId: lead.id };
  }
}
