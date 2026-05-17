import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../common/entities/form.entity';
import { LeadsService } from '../leads/leads.service';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { FacebookService } from '../facebook/facebook.service';
import { MessagingService } from '../messaging/messaging.service';
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
    private messagingService: MessagingService,
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

  async capture(dto: { name: string; phone: string; email?: string; instagram?: string; revenue?: string; fbclid?: string; fbc?: string; clickId?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; fbp?: string; userAgent?: string; clientIp?: string }): Promise<{ success: boolean; leadId: string }> {
    const normalizedPhone = (dto.phone || '').replace(/\D/g, '');
    const lead = await this.leadsService.create({
      name: dto.name,
      phone: normalizedPhone,
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
    } else {
      // Sem Instagram: envia mensagem baseada no faturamento após 8s
      setTimeout(() => {
        this.sendRevenueMessage(lead.id, lead.name, dto.revenue).catch(err =>
          this.logger.error(`Erro ao enviar msg de faturamento para ${lead.id}: ${err.message}`),
        );
      }, 8000);
    }

    this.facebookService.sendLeadEvent(lead, { fbp: dto.fbp, fbc: dto.fbc, userAgent: dto.userAgent, clientIp: dto.clientIp }).catch(err =>
      this.logger.error(`Erro ao enviar Lead event ao Facebook: ${err.message}`),
    );

    this.logger.log(`Lead capturado via leadscomia: ${lead.id} - ${lead.name}`);
    return { success: true, leadId: lead.id };
  }

  private async sendRevenueMessage(leadId: string, name: string, revenue?: string): Promise<void> {
    const firstName = name.split(' ')[0];

    const messages: Record<string, string> = {
      'ate-10k': `${firstName}! parabéns por dar esse passo\nme fala o nome da sua empresa e qual é sua maior dificuldade pra sair desse platô de 10 mil?`,
      '10k-30k': `${firstName}! faturando entre 10 e 30 mil já tem estrutura\nme conta o que tá travando você de chegar nos 100 mil?`,
      '30k-100k': `${firstName}! negócio sólido esse seu, entre 30 e 100 mil já prova que funciona\nme fala qual é seu maior gargalo hoje pra escalar?`,
      '100k-300k': `${firstName}! negócio de 6 dígitos, isso é sério\nme conta o que tá travando você de chegar nos 7 dígitos?`,
      'acima-300k': `${firstName}! que máquina de negócio\ncom esse faturamento a questão não é crescer, é escalar sem travar o processo\nme conta qual é o maior gargalo hoje?`,
    };

    const text = messages[revenue || ''] || `${firstName}! vi que você se cadastrou\nme conta o nome da sua empresa e qual é sua maior dificuldade hoje pra crescer?`;

    await this.messagingService.sendMessage({ leadId, text });
    this.logger.log(`Mensagem de faturamento enviada para lead ${leadId} (${revenue || 'sem faturamento'})`);
  }

  async submit(formId: string, dto: SubmitFormDto): Promise<{ success: boolean; leadId: string }> {
    await this.findById(formId);

    if (!dto.phone) throw new BadRequestException('Telefone é obrigatório');

    const { score, classification } = this.scoringEngine.score(dto.responses || {});

    const lead = await this.leadsService.create({
      campaignId: formId,
      name: dto.name,
      email: dto.email,
      phone: (dto.phone || '').replace(/\D/g, ''),
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
