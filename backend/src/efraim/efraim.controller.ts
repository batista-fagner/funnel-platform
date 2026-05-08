import { Controller, Post, Body, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { EfraimService } from './efraim.service';
import { LeadsService } from '../leads/leads.service';
import { Lead, WaStage } from '../common/entities/lead.entity';

@Controller('webhooks')
export class EfraimController {
  private readonly logger = new Logger(EfraimController.name);
  private readonly processedIds = new Set<string>();
  private readonly pendingBuffer = new Map<string, { timer: NodeJS.Timeout; texts: string[] }>();
  private readonly uazapiBaseUrl: string;
  private readonly uazapiToken: string;

  private readonly eventDate: string;

  constructor(
    private readonly efraimService: EfraimService,
    private readonly leadsService: LeadsService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.uazapiBaseUrl = config.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com';
    this.uazapiToken = config.get('UAZAPI_TOKEN') || '';
    this.eventDate = config.get('EFRAIM_EVENT_DATE') || 'terça às 20h';
  }

  @Post('uazapi')
  async handleWhatsAppWebhook(@Body() body: any) {
    // Formato uazapi
    if (body.EventType !== 'messages') return { ok: true };

    const message = body.message;
    if (!message) return { ok: true };

    // Ignora mensagens enviadas pelo bot, grupos ou duplicadas
    if (message.fromMe || message.isGroup || message.wasSentByApi) return { ok: true };

    const phone: string = (body.chat?.phone ?? '').replace(/\D/g, '');
    const text: string = message.text ?? '';
    const messageId: string = message.messageid ?? '';

    if (!phone || !text) return { ok: true };

    // Ignora mensagens antigas (> 5 min) — messageTimestamp vem em segundos do uazapi
    if (message.messageTimestamp) {
      const ageSeconds = (Date.now() / 1000) - message.messageTimestamp;
      if (ageSeconds > 300) {
        this.logger.warn(`Mensagem ignorada — antiga (${Math.round(ageSeconds)}s): ${phone}`);
        return { ok: true };
      }
    }

    // Deduplicação
    if (this.processedIds.has(messageId)) {
      this.logger.warn(`Webhook duplicado ignorado: ${messageId}`);
      return { ok: true };
    }
    this.processedIds.add(messageId);
    setTimeout(() => this.processedIds.delete(messageId), 5 * 60 * 1000);

    this.logger.log(`Mensagem recebida de ${phone}: "${text}"`);

    // Debounce: acumula mensagens por 10s antes de processar
    const pending = this.pendingBuffer.get(phone) ?? { timer: null as any, texts: [] as string[] };
    pending.texts.push(text);

    if (pending.timer) clearTimeout(pending.timer);

    pending.timer = setTimeout(() => {
      const combinedText = pending.texts.join('\n');
      this.pendingBuffer.delete(phone);
      this.logger.log(`Processando ${pending.texts.length} mensagem(ns) de ${phone}`);
      this.processMessage(phone, combinedText).catch((err) =>
        this.logger.error(`Erro ao processar mensagem de ${phone}: ${err.message}`),
      );
    }, 10_000);

    this.pendingBuffer.set(phone, pending);

    return { ok: true };
  }

  private async processMessage(phone: string, text: string) {
    // Tenta com e sem DDI 55
    const phoneVariants = phone.startsWith('55')
      ? [phone, phone.slice(2)]
      : [phone, `55${phone}`];
    let lead: Lead | null = null;
    for (const p of phoneVariants) {
      lead = await this.leadsService.findByPhone(p);
      if (lead) break;
    }
    if (!lead) {
      this.logger.warn(`Nenhum lead encontrado para phone ${phone}`);
      return;
    }

    // Define stage inicial se for a primeira resposta
    if (!lead.waStage) {
      await this.leadsService.update(lead.id, { waStage: 'abertura' as WaStage });
      lead.waStage = 'abertura';
    }

    // Não processa se já encerrado
    if (lead.waStage === 'encerrado') {
      this.logger.log(`Lead ${phone} em stage "encerrado" — sem resposta automática`);
      return;
    }

    // Mostra "digitando..." por 2s antes de responder
    await this.sendTyping(phone, 2000);

    // Processa com IA (1 retry automático se falhar)
    let aiResponse = await this.efraimService.processMessage(lead, text);
    if (!aiResponse.success) {
      this.logger.warn(`Efraim falhou, tentando novamente em 2s para ${phone}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      aiResponse = await this.efraimService.processMessage(lead, text);
    }

    const previousStage = lead.waStage;

    // Atualiza contexto e stage no lead
    const updatedContext = this.efraimService.buildUpdatedContext(lead, text, aiResponse.reply);
    await this.leadsService.update(lead.id, {
      aiContext: updatedContext,
      waStage: aiResponse.stage,
      waLastMessageAt: new Date(),
    });

    // Envia resposta via uazapi (silencioso se erro)
    if (aiResponse.reply) await this.sendMessage(phone, aiResponse.reply);

    // Se entrou no stage "video" pela primeira vez, envia follow-up automático
    if (aiResponse.stage === 'video' && previousStage !== 'video') {
      setTimeout(async () => {
        try {
          await this.sendTyping(phone, 3000);
          const followupText = await this.efraimService.generateVideoFollowup(lead, this.eventDate);
          await this.sendMessage(phone, followupText);
          await this.leadsService.update(lead.id, { waStage: 'fechamento' });
          this.logger.log(`Follow-up de vídeo enviado para ${phone}, stage → fechamento`);
        } catch (err: any) {
          this.logger.error(`Erro no follow-up de vídeo: ${err.message}`);
        }
      }, 5000);
    }
  }

  private async sendMessage(phone: string, text: string) {
    try {
      const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      await firstValueFrom(
        this.http.post(
          `${this.uazapiBaseUrl}/send/text`,
          { number: normalizedPhone, text },
          { headers: { token: this.uazapiToken } },
        ),
      );
      this.logger.log(`Efraim respondeu para ${phone}`);
    } catch (err: any) {
      this.logger.error(`Erro ao enviar resposta para ${phone}: ${err.message}`);
    }
  }

  private async sendTyping(phone: string, durationMs: number) {
    try {
      const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      await firstValueFrom(
        this.http.post(
          `${this.uazapiBaseUrl}/message/presence`,
          { number: normalizedPhone, presence: 'composing', delay: durationMs },
          { headers: { token: this.uazapiToken } },
        ),
      );
    } catch {
      // Não crítico, ignora erro de typing indicator
    }
  }
}
