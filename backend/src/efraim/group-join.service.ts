import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LeadsService } from '../leads/leads.service';
import { MessagingService } from '../messaging/messaging.service';
import { WaStage } from '../common/entities/lead.entity';

/**
 * Escuta o SSE do uazapi (events=groups) e detecta quando uma pessoa entra
 * no grupo da live. Ao entrar, cria o lead (só com o número) e o Efraim inicia
 * a conversa pedindo o nome. Substitui o fluxo do formulário da landing page.
 */
@Injectable()
export class GroupJoinService implements OnModuleInit {
  private readonly logger = new Logger(GroupJoinService.name);
  private readonly uazapiBaseUrl: string;
  private readonly uazapiToken: string;
  private reconnecting = false;
  // Evita processar o mesmo Join duas vezes se o SSE reenviar
  private readonly recentJoins = new Set<string>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly leadsService: LeadsService,
    private readonly messagingService: MessagingService,
  ) {
    this.uazapiBaseUrl = config.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com';
    this.uazapiToken = config.get('UAZAPI_TOKEN') || '';
  }

  onModuleInit() {
    if (!this.uazapiToken) {
      this.logger.warn('UAZAPI_TOKEN não configurado — SSE de grupo não iniciado');
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
        const raw = chunk.toString();
        this.logger.debug(`[SSE RAW] ${raw.replace(/\n/g, '\\n')}`);
        buffer += raw;
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
    // Deduplicação em memória (SSE pode reenviar o mesmo evento)
    if (this.recentJoins.has(phone)) {
      this.logger.debug(`[GROUP JOIN] ${phone} ignorado por deduplicação`);
      return;
    }
    this.recentJoins.add(phone);
    setTimeout(() => this.recentJoins.delete(phone), 30_000);

    // Verifica se já existe lead com esse número (variantes com/sem 9 e DDI)
    const existing = await this.findLeadByPhoneVariants(phone);
    if (existing) {
      this.logger.log(`Lead já existe para ${phone} (${existing.name}) — não reinicia fluxo`);
      return;
    }

    const lead = await this.leadsService.create({
      name: 'Novo Lead',
      phone,
      status: 'novo',
      score: 0,
      utmSource: 'whatsapp-grupo',
      utmMedium: 'grupo-live',
      waStage: 'aguardando_nome' as WaStage,
    });

    const opening = `opa! aqui é o Efraim, da equipe do Fagner 👋\nvi que você entrou no grupo da live\nantes da gente começar, como é seu nome?`;

    await this.messagingService.sendRawMessage(phone, opening);
    await this.leadsService.update(lead.id, {
      status: 'contatado',
      aiContext: [{ role: 'assistant', content: opening }],
      waLastMessageAt: new Date(),
    });

    this.logger.log(`Novo lead via grupo: ${lead.id} (${phone}) — aguardando nome`);
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
