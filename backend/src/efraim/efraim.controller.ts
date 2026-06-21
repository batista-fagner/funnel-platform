import { Controller, Post, Body, Logger, Param } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EfraimService } from './efraim.service';
import { LeadsService } from '../leads/leads.service';
import { MessagingService } from '../messaging/messaging.service';
import { FacebookService } from '../facebook/facebook.service';
import { Lead, WaStage } from '../common/entities/lead.entity';

const MQL_REVENUES = ['30k-100k', '100k-300k', 'acima-300k'];
const REVENUE_KEYS = ['ate-10k', '10k-30k', '30k-100k', '100k-300k', 'acima-300k'];
const REVENUE_LABELS: Record<string, string> = {
  'ate-10k': 'Até R$ 10 mil',
  '10k-30k': 'R$ 10 mil – R$ 30 mil',
  '30k-100k': 'R$ 30 mil – R$ 100 mil',
  '100k-300k': 'R$ 100 mil – R$ 300 mil',
  'acima-300k': 'Acima de R$ 300 mil',
};

@Controller('webhooks')
export class EfraimController {
  private readonly logger = new Logger(EfraimController.name);
  private readonly processedIds = new Set<string>();
  private readonly pendingBuffer = new Map<string, { timer: NodeJS.Timeout; texts: string[] }>();
  private readonly uazapiBaseUrl: string;
  private readonly uazapiToken: string;
  private readonly eventDate: string;
  private readonly supabase: SupabaseClient;
  private readonly mediaBucket: string;

  constructor(
    private readonly efraimService: EfraimService,
    private readonly leadsService: LeadsService,
    private readonly messagingService: MessagingService,
    private readonly facebookService: FacebookService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.uazapiBaseUrl = config.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com';
    this.uazapiToken = config.get('UAZAPI_TOKEN') || '';
    this.eventDate = config.get('EFRAIM_EVENT_DATE') || 'terça às 20h';
    this.supabase = createClient(
      config.get('SUPABASE_URL') ?? '',
      config.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    this.mediaBucket = config.get('EFRAIM_MEDIA_BUCKET') ?? 'efraim-media';
  }

  // O uazapi (com addUrlEvents) envia cada evento num path /uazapi/{evento}.
  // Mensagens diretas chegam aqui; entradas no grupo vêm pelo SSE (GroupJoinService).
  @Post('uazapi/:eventType')
  async handleEvent(@Param('eventType') eventType: string, @Body() body: any) {
    if (eventType === 'messages') {
      return this.handleWhatsAppWebhook(body);
    }
    return { ok: true };
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
    let text: string = message.text ?? '';
    const messageId: string = message.messageid ?? '';
    const isAudio = message.type === 'media' && ['audio', 'ptt', 'myaudio'].includes(message.mediaType);

    if (!phone) return { ok: true };

    // Transcreve áudio via uazapi + Whisper antes de seguir o fluxo normal
    if (isAudio && messageId) {
      try {
        this.logger.log(`Áudio recebido de ${phone} — transcrevendo...`);
        const res = await firstValueFrom(
          this.http.post(
            `${this.uazapiBaseUrl}/message/download`,
            { id: messageId, transcribe: true, generate_mp3: false, return_link: false, openai_apikey: this.config.get('OPENAI_API_KEY') },
            { headers: { token: this.uazapiToken } },
          ),
        );
        text = (res.data as any).transcription ?? '';
        if (!text) {
          this.logger.warn(`Transcrição vazia para áudio de ${phone} — ignorando`);
          return { ok: true };
        }
        this.logger.log(`Áudio de ${phone} transcrito: "${text}"`);
      } catch (err: any) {
        this.logger.error(`Erro ao transcrever áudio de ${phone}: ${err.message}`);
        return { ok: true };
      }
    }

    if (!text) return { ok: true };

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
    // Normaliza variantes com/sem DDI 55 e com/sem o 9 extra (Brasil)
    const addNine = (n: string) => n.length === 10 ? `${n.slice(0, 2)}9${n.slice(2)}` : n;
    const removeNine = (n: string) => n.length === 11 && n[2] === '9' ? `${n.slice(0, 2)}${n.slice(3)}` : n;
    const base = phone.startsWith('55') ? phone.slice(2) : phone;
    const phoneVariants = [
      `55${base}`,
      base,
      `55${addNine(base)}`,
      addNine(base),
      `55${removeNine(base)}`,
      removeNine(base),
    ];
    let lead: Lead | null = null;
    for (const p of phoneVariants) {
      lead = await this.leadsService.findByPhone(p);
      if (lead) break;
    }
    if (!lead) {
      this.logger.warn(`Nenhum lead encontrado para phone ${phone}`);
      return;
    }

    // Fluxo de entrada via grupo: coleta nome e faturamento antes da IA assumir
    if (lead.waStage === 'aguardando_nome') {
      await this.handleNomeStage(lead, text);
      return;
    }
    if (lead.waStage === 'aguardando_faturamento') {
      const transitioned = await this.handleFaturamentoStage(lead, text);
      if (!transitioned) return; // faturamento não reconhecido — já reperguntou
      // se reconheceu, segue para o fluxo de IA (stage agora é 'escuta')
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
    const updateData: any = {
      aiContext: updatedContext,
      waStage: aiResponse.stage,
      waLastMessageAt: new Date(),
    };
    if (typeof (aiResponse as any).waMessagesAfterConfirmed === 'number') {
      updateData.waMessagesAfterConfirmed = (aiResponse as any).waMessagesAfterConfirmed;
    }
    await this.leadsService.update(lead.id, updateData);

    // Envia resposta via uazapi (silencioso se erro)
    if (aiResponse.reply) await this.sendMessage(phone, aiResponse.reply);

    // Se entrou no stage "video" pela primeira vez, envia vídeo + follow-up automático
    if (aiResponse.stage === 'video' && previousStage !== 'video') {
      // Envia o vídeo imediatamente após a resposta de texto
      const videoUrl = await this.getVideoUrl('video-whatsapp');
      if (videoUrl) {
        await this.sendVideo(phone, videoUrl);
      } else {
        this.logger.warn(`Vídeo "video-whatsapp" não encontrado no bucket ${this.mediaBucket}`);
      }

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

  private async getVideoUrl(name: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.mediaBucket)
        .list('', { search: name });

      if (error || !data?.length) return null;

      const file = data.find(f => f.name.startsWith(name));
      if (!file) return null;

      const { data: urlData } = this.supabase.storage
        .from(this.mediaBucket)
        .getPublicUrl(file.name);

      return urlData.publicUrl;
    } catch (err: any) {
      this.logger.error(`Erro ao buscar vídeo "${name}": ${err.message}`);
      return null;
    }
  }

  private async sendVideo(phone: string, videoUrl: string) {
    try {
      const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      await firstValueFrom(
        this.http.post(
          `${this.uazapiBaseUrl}/send/media`,
          { number: normalizedPhone, file: videoUrl, type: 'video', text: '', delay: 1000 },
          { headers: { token: this.uazapiToken } },
        ),
      );
      this.logger.log(`Vídeo enviado para ${phone}`);
    } catch (err: any) {
      this.logger.error(`Erro ao enviar vídeo para ${phone}: ${err.message}`);
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

  // ── Fluxo de entrada via grupo: coleta de nome e faturamento ──────────────

  private async handleNomeStage(lead: Lead, text: string) {
    const name = this.extractName(text);
    const firstName = name.split(' ')[0];
    const question = `prazer, ${firstName}! 🙌\nme conta, qual a faixa de faturamento do seu negócio hoje?\n\n1 - até 10k\n2 - 10k a 30k\n3 - 30k a 100k\n4 - 100k a 300k\n5 - acima de 300k\n\npode mandar só o número`;

    const history = Array.isArray(lead.aiContext) ? lead.aiContext : [];
    const aiContext = [...history, { role: 'user', content: text }, { role: 'assistant', content: question }];

    await this.leadsService.update(lead.id, {
      name,
      waStage: 'aguardando_faturamento' as WaStage,
      aiContext,
      waLastMessageAt: new Date(),
    });

    await this.sendTyping(lead.phone, 1500);
    await new Promise((r) => setTimeout(r, 1500));
    await this.sendMessage(lead.phone, question);
    this.logger.log(`Nome coletado para ${lead.phone}: ${name} — aguardando faturamento`);
  }

  /** Retorna true se reconheceu o faturamento (segue p/ IA); false se repergunta. */
  private async handleFaturamentoStage(lead: Lead, text: string): Promise<boolean> {
    const bucket = this.parseRevenue(text);
    if (!bucket) {
      const reask = `não entendi 😅 me manda só o número da faixa:\n\n1 - até 10k\n2 - 10k a 30k\n3 - 30k a 100k\n4 - 100k a 300k\n5 - acima de 300k`;
      const history = Array.isArray(lead.aiContext) ? lead.aiContext : [];
      await this.leadsService.update(lead.id, {
        aiContext: [...history, { role: 'user', content: text }, { role: 'assistant', content: reask }],
      });
      await this.sendMessage(lead.phone, reask);
      return false;
    }

    const isMql = MQL_REVENUES.includes(bucket);
    await this.leadsService.update(lead.id, { revenueRange: bucket, isMql, waStage: 'escuta' as WaStage });
    lead.revenueRange = bucket;
    lead.isMql = isMql;
    lead.waStage = 'escuta';

    this.logger.log(`Faturamento coletado para ${lead.phone}: ${bucket} (MQL=${isMql})`);

    if (isMql) {
      this.facebookService.sendMqlEvent(lead, { fbp: lead.fbp, fbc: lead.fbc }).catch((err) =>
        this.logger.error(`Erro ao enviar MQL event: ${err.message}`),
      );
      this.notifyMql(lead).catch((err) =>
        this.logger.error(`Erro ao notificar MQL: ${err.message}`),
      );
    }

    return true;
  }

  private extractName(text: string): string {
    let t = text.trim().replace(/[\n\r]+/g, ' ');
    t = t.replace(/^(meu nome (é|e)|me chamo|sou (o|a)|aqui (é|e)( o| a)?|nome:?|eu sou( o| a)?)\s+/i, '');
    t = t.split(/\s+/).slice(0, 3).join(' ');
    if (!t) return text.trim().slice(0, 60) || 'Lead';
    return t.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  }

  private parseRevenue(text: string): string | null {
    const t = text.toLowerCase().trim();

    // 1) resposta apenas com o número da opção (1-5), sem texto de valor
    const optOnly = t.match(/^([1-5])(?:[\s.,)\-]|[^\x00-\x7F])*$/);
    if (optOnly) return REVENUE_KEYS[Number(optOnly[1]) - 1];

    // 2) valor explícito (ex: "50 mil", "100k", "1 milhão", "2kk")
    let valueK: number | null = null;
    const milhao = t.match(/(\d+(?:[.,]\d+)?)\s*(milh|kk|mi\b)/);
    if (milhao) {
      valueK = parseFloat(milhao[1].replace(',', '.')) * 1000;
    } else {
      const m = t.match(/(\d+(?:[.,]\d+)?)/);
      if (m) valueK = parseFloat(m[1].replace(',', '.'));
    }

    if (valueK === null) {
      if (/(acima|mais de|\+|passa de).*(300|500)/.test(t)) return 'acima-300k';
      return null;
    }
    if (valueK < 10) return 'ate-10k';
    if (valueK < 30) return '10k-30k';
    if (valueK < 100) return '30k-100k';
    if (valueK < 300) return '100k-300k';
    return 'acima-300k';
  }

  private async notifyMql(lead: Lead): Promise<void> {
    const phone = this.config.get('MQL_NOTIFICATION_PHONE') || '71992867765';
    const revenue = REVENUE_LABELS[lead.revenueRange || ''] || lead.revenueRange || '—';
    const linhas = [
      '🎯 *NOVO LEAD MQL!* (via grupo)',
      '',
      `*Nome:* ${lead.name}`,
      `*WhatsApp:* ${lead.phone}`,
      `*Faturamento:* ${revenue}`,
    ];
    await this.messagingService.sendRawMessage(phone, linhas.join('\n'));
  }
}
