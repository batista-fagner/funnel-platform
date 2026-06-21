import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LeadsService } from '../leads/leads.service';
import { MessagingService } from '../messaging/messaging.service';
import { FacebookService } from '../facebook/facebook.service';
import { TrackingService } from '../tracking/tracking.service';
import { WaStage } from '../common/entities/lead.entity';

/**
 * Escuta o SSE do uazapi (events=groups) e detecta quando uma pessoa entra
 * no grupo da live. Ao entrar:
 *  1. Busca o nome do WhatsApp via /contacts/info
 *  2. Cria o lead no banco
 *  3. Envia evento Lead pro Meta (CAPI) com telefone + nome real
 *  4. Efraim inicia conversa (pula nome se já souber, vai direto ao faturamento)
 */
@Injectable()
export class GroupJoinService implements OnModuleInit {
  private readonly logger = new Logger(GroupJoinService.name);
  private readonly uazapiBaseUrl: string;
  private readonly uazapiToken: string;
  private reconnecting = false;
  private readonly recentJoins = new Set<string>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly leadsService: LeadsService,
    private readonly messagingService: MessagingService,
    private readonly facebookService: FacebookService,
    private readonly trackingService: TrackingService,
  ) {
    this.uazapiBaseUrl = config.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com';
    this.uazapiToken = config.get('UAZAPI_TOKEN') || '';
  }

  onModuleInit() {
    if (!this.uazapiToken) {
      this.logger.warn('UAZAPI_TOKEN não configurado — SSE de grupo não iniciado');
      return;
    }
    if (this.config.get('DISABLE_GROUP_JOIN_SSE') === 'true') {
      this.logger.warn('DISABLE_GROUP_JOIN_SSE=true — SSE de grupo desativado neste ambiente');
      return;
    }
    this.connect();
  }

  private async connect() {
    const url = `${this.uazapiBaseUrl}/sse?token=${this.uazapiToken}&events=groups`;
    try {
      const response = await firstValueFrom(
        this.http.get(url, { responseType: 'stream', timeout: 0 }),
      );
      this.logger.log('SSE de grupos conectado ao uazapi');

      const stream = response.data as NodeJS.ReadableStream;
      let buffer = '';

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        let idx: number;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line.startsWith('data:')) {
            const json = line.slice(5).trim();
            if (json) this.handleEvent(json);
          }
        }
      });

      stream.on('end', () => {
        this.logger.warn('SSE de grupos encerrado — reconectando...');
        this.scheduleReconnect();
      });
      stream.on('error', (err: Error) => {
        this.logger.error(`SSE de grupos erro: ${err.message}`);
        this.scheduleReconnect();
      });
    } catch (err: any) {
      this.logger.error(`Falha ao conectar SSE de grupos: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setTimeout(() => {
      this.reconnecting = false;
      this.connect();
    }, 5000);
  }

  private handleEvent(json: string) {
    let evt: any;
    try {
      evt = JSON.parse(json);
    } catch {
      return;
    }
    if (evt.EventType !== 'groups') return;

    const joins = evt.event?.Join;
    if (!Array.isArray(joins) || joins.length === 0) return;

    for (const jid of joins) {
      const phone = String(jid).split('@')[0].replace(/\D/g, '');
      if (!phone) continue;
      this.handleJoin(phone).catch((err) =>
        this.logger.error(`Erro ao processar entrada no grupo (${phone}): ${err.message}`),
      );
    }
  }

  private async handleJoin(phone: string) {
    if (this.recentJoins.has(phone)) {
      this.logger.debug(`[GROUP JOIN] ${phone} ignorado por deduplicação`);
      return;
    }
    this.recentJoins.add(phone);
    setTimeout(() => this.recentJoins.delete(phone), 30_000);

    const existing = await this.findLeadByPhoneVariants(phone);
    if (existing) {
      this.logger.log(`Lead já existe para ${phone} (${existing.name}) — não reinicia fluxo`);
      return;
    }

    // Busca nome do WhatsApp via uazapi
    const waName = await this.fetchContactName(phone);
    const hasName = !!waName;
    const leadName = waName || 'Novo Lead';

    // Consome UTMs do clique mais recente na LP (FIFO)
    const utm = this.trackingService.consumeNextUtm();

    // Cria lead no banco
    const lead = await this.leadsService.create({
      name: leadName,
      phone,
      status: 'novo',
      score: 0,
      utmSource: utm?.utmSource || 'whatsapp-grupo',
      utmMedium: utm?.utmMedium || 'grupo-live',
      utmCampaign: utm?.utmCampaign,
      utmContent: utm?.utmContent,
      utmTerm: utm?.utmTerm,
      fbclid: utm?.fbclid,
      fbc: utm?.fbc,
      fbp: utm?.fbp,
      clickId: utm?.clickId,
      waStage: (hasName ? 'aguardando_faturamento' : 'aguardando_nome') as WaStage,
    });

    // Envia evento Lead pro Meta (CAPI) com telefone + nome real + cookies do Meta Pixel
    this.facebookService.sendLeadEvent(lead, { fbp: lead.fbp, fbc: lead.fbc }).catch((err) =>
      this.logger.error(`Erro ao enviar Lead event ao Facebook: ${err.message}`),
    );

    // Mensagem de abertura — pula pergunta de nome se já tiver
    const firstName = leadName.split(' ')[0];
    const opening = hasName
      ? `opa, ${firstName}! aqui é o Efraim, da equipe do Fagner 👋 parabéns por entrar no grupo de implementação de funil com IA! tenho um presentinho pra você no final\n\nme conta, qual a faixa de faturamento do seu negócio hoje?\n\n1 - até 10k\n2 - 10k a 30k\n3 - 30k a 100k\n4 - 100k a 300k\n5 - acima de 300k\n\npode mandar só o número`
      : `opa! aqui é o Efraim, da equipe do Fagner 👋 parabéns por entrar no grupo de implementação de funil com IA! tenho um presentinho pra você no final, me diz seu Nome antes por favor!`;

    await this.messagingService.sendRawMessage(phone, opening);
    await this.leadsService.update(lead.id, {
      status: 'contatado',
      aiContext: [{ role: 'assistant', content: opening }],
      waLastMessageAt: new Date(),
    });

    this.logger.log(`Novo lead via grupo: ${lead.id} (${phone}) nome=${leadName} hasName=${hasName}`);
  }

  /** Busca o nome do contato no WhatsApp via uazapi /contacts/info */
  private async fetchContactName(phone: string): Promise<string | null> {
    try {
      const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      const res = await firstValueFrom(
        this.http.post(
          `${this.uazapiBaseUrl}/contacts/info`,
          { number: normalizedPhone },
          { headers: { token: this.uazapiToken } },
        ),
      );
      const data = res.data as any;
      const name: string = data?.name || data?.pushName || data?.notify || '';
      if (!name || name === normalizedPhone || name === phone) return null;
      return name.trim();
    } catch (err: any) {
      this.logger.warn(`Não foi possível buscar nome do contato ${phone}: ${err.message}`);
      return null;
    }
  }

  private async findLeadByPhoneVariants(phone: string) {
    const addNine = (n: string) => (n.length === 10 ? `${n.slice(0, 2)}9${n.slice(2)}` : n);
    const removeNine = (n: string) =>
      n.length === 11 && n[2] === '9' ? `${n.slice(0, 2)}${n.slice(3)}` : n;
    const base = phone.startsWith('55') ? phone.slice(2) : phone;
    const variants = [
      `55${base}`,
      base,
      `55${addNine(base)}`,
      addNine(base),
      `55${removeNine(base)}`,
      removeNine(base),
    ];
    for (const p of variants) {
      const lead = await this.leadsService.findByPhone(p);
      if (lead) return lead;
    }
    return null;
  }
}
