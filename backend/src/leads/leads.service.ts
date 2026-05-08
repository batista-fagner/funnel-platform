import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadClassification } from '../common/entities/lead.entity';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead)
    private leadsRepo: Repository<Lead>,
  ) {}

  async create(dto: Partial<Lead>): Promise<Lead> {
    const lead = this.leadsRepo.create(dto);
    const saved = await this.leadsRepo.save(lead);
    this.logger.log(`Lead criado: ${saved.id} - ${saved.name} (${saved.phone})`);
    return saved;
  }

  async findById(id: string): Promise<Lead> {
    const lead = await this.leadsRepo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} não encontrado`);
    return lead;
  }

  async findByPhone(phone: string): Promise<Lead | null> {
    return this.leadsRepo.findOne({ where: { phone } });
  }

  async findAll(opts?: { campaignId?: string; page?: number; limit?: number; source?: 'all' | 'ig_dm' | 'paid' }): Promise<{ data: Lead[]; total: number; page: number; totalPages: number }> {
    const page = opts?.page || 1;
    const limit = opts?.limit || 6;
    const source = opts?.source || 'all';
    const skip = (page - 1) * limit;

    const query = this.leadsRepo.createQueryBuilder('lead');

    if (opts?.campaignId) query.where('lead.campaign_id = :campaignId', { campaignId: opts.campaignId });

    if (source === 'ig_dm') {
      query.andWhere('lead.utm_source = :utmSource', { utmSource: 'instagram' });
      query.andWhere('lead.utm_medium = :utmMedium', { utmMedium: 'dm-automation' });
    } else if (source === 'paid') {
      query.andWhere('(lead.fbclid IS NOT NULL OR lead.utm_source IN (:...sources))', { sources: ['facebook', 'leadscomia'] });
    }

    const total = await query.getCount();
    const data = await query.orderBy('lead.created_at', 'DESC').skip(skip).take(limit).getMany();
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, totalPages };
  }

  async update(id: string, dto: Partial<Lead>): Promise<Lead> {
    await this.leadsRepo.update(id, dto);
    return this.findById(id);
  }

  async updateScore(id: string, score: number): Promise<Lead> {
    const classification = this.classifyScore(score);
    return this.update(id, { score, classification });
  }

  async findByPhones(phones: string[]): Promise<Map<string, string>> {
    const leads = await this.leadsRepo.find({
      where: phones.map(phone => ({ phone })),
    });
    return new Map(leads.map(l => [l.phone, l.name]));
  }

  async markAsConverted(id: string): Promise<Lead> {
    return this.update(id, { status: 'convertido' });
  }

  async clearAll(): Promise<{ deleted: number }> {
    const result = await this.leadsRepo.createQueryBuilder().delete().from(Lead).execute();
    this.logger.warn(`Todos os ${result.affected} leads foram deletados`);
    return { deleted: result.affected || 0 };
  }

  private classifyScore(score: number): LeadClassification {
    if (score >= 100) return 'otimo';
    if (score >= 60) return 'bom';
    return 'frio';
  }
}
