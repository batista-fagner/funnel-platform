import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LeadsService } from '../leads/leads.service';

interface SendMessageDto {
  leadId: string;
  text: string;
}

interface BulkMessageDto {
  leadIds: string[];
  text: string;
  delayMin?: number;
  delayMax?: number;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly uazapiBaseUrl: string;
  private readonly uazapiToken: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
    private leadsService: LeadsService,
  ) {
    this.uazapiBaseUrl = config.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com';
    this.uazapiToken = config.get('UAZAPI_TOKEN') || '';
  }

  private get headers() {
    return { token: this.uazapiToken };
  }

  async sendMessage(dto: SendMessageDto): Promise<any> {
    const lead = await this.leadsService.findById(dto.leadId);
    const phone = this.normalizePhone(lead.phone);
    const text = this.interpolate(dto.text, { nome: lead.name, instagram: lead.instagram || '' });

    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.uazapiBaseUrl}/send/text`,
          { number: phone, text },
          { headers: this.headers },
        ),
      );

      await this.leadsService.update(dto.leadId, { status: 'contatado' });
      this.logger.log(`Mensagem enviada para ${phone} (lead: ${lead.name})`);
      return response.data;
    } catch (err) {
      this.logger.error(`Erro ao enviar mensagem para ${phone}: ${err.message}`);
      throw err;
    }
  }

  async sendBulk(dto: BulkMessageDto): Promise<{ queued: number; successful: number; failed: number }> {
    const { leadIds, text, delayMin = 5, delayMax = 15 } = dto;
    let successful = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      try {
        await this.sendMessage({ leadId, text });
        successful++;

        const delay = Math.random() * (delayMax - delayMin) + delayMin;
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      } catch (err) {
        failed++;
        this.logger.warn(`Falha ao enviar para lead ${leadId}: ${err.message}`);
      }
    }

    this.logger.log(`Bulk message concluído: ${successful} enviadas, ${failed} falhadas`);
    return { queued: leadIds.length, successful, failed };
  }

  async sendTypingIndicator(leadId: string, durationMs = 3000): Promise<void> {
    const lead = await this.leadsService.findById(leadId);
    const phone = this.normalizePhone(lead.phone);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.uazapiBaseUrl}/message/presence`,
          { number: phone, presence: 'composing', delay: durationMs },
          { headers: this.headers },
        ),
      );
    } catch (err) {
      this.logger.warn(`Erro ao enviar typing indicator para ${phone}: ${err.message}`);
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{${key}}`, 'gi'), value || '');
    }
    return result;
  }
}
