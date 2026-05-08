import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InstagramAutomation } from './instagram-automation.entity';
import { IgConversation } from './ig-conversation.entity';
import { Lead } from '../common/entities/lead.entity';

const IG_API = 'https://graph.instagram.com/v21.0';

@Injectable()
export class InstagramAutomationService {
  private readonly logger = new Logger(InstagramAutomationService.name);

  constructor(
    @InjectRepository(InstagramAutomation)
    private repo: Repository<InstagramAutomation>,
    @InjectRepository(IgConversation)
    private convRepo: Repository<IgConversation>,
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    private config: ConfigService,
  ) {}

  private get igToken() {
    return this.config.get<string>('IG_TOKEN');
  }

  private async getIgUserId(): Promise<string> {
    const stored = this.config.get<string>('IG_USER_ID');
    if (stored) return stored;
    const res = await axios.get(`${IG_API}/me`, {
      params: { fields: 'id,username', access_token: this.igToken },
    });
    const igId = res.data.id;
    if (igId) return igId;
    throw new Error('Conta Instagram não encontrada. Configure IG_USER_ID no .env');
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  create(dto: Partial<InstagramAutomation>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: Partial<InstagramAutomation>) {
    await this.repo.update(id, dto);
    return this.repo.findOneBy({ id });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }

  findConversations(automationId: string) {
    return this.convRepo.find({
      where: { automationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRecentMedia(after?: string) {
    const igUserId = await this.getIgUserId();
    const res = await axios.get(`${IG_API}/${igUserId}/media`, {
      params: {
        fields: 'id,media_type,media_url,thumbnail_url,timestamp,caption,permalink,children{media_url,thumbnail_url}',
        limit: 12,
        ...(after ? { after } : {}),
        access_token: this.igToken,
      },
    });
    return res.data;
  }

  async subscribeWebhook() {
    const igUserId = await this.getIgUserId();
    await axios.post(
      `${IG_API}/${igUserId}/subscribed_apps`,
      {},
      { params: { subscribed_fields: 'comments,messages', access_token: this.igToken } },
    );
    return { subscribed: true, igUserId };
  }

  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ─── Webhook principal ──────────────────────────────────────────────────────

  async handleWebhookEvent(body: any) {
    this.logger.log(`Webhook recebido: ${JSON.stringify(body)}`);
    const entries: any[] = body.entry || [];

    for (const entry of entries) {
      // Mensagens DM (respostas do lead)
      for (const messaging of entry.messaging || []) {
        await this.handleMessagingEvent(messaging).catch(err =>
          this.logger.error(`Erro ao processar messaging: ${err.message}`),
        );
      }

      // Comentários no post
      for (const change of entry.changes || []) {
        if (change.field !== 'comments') continue;
        await this.handleCommentEvent(change.value).catch(err =>
          this.logger.error(`Erro ao processar comentário: ${err.message}`),
        );
      }
    }
  }

  // ─── Comentário disparando automação ────────────────────────────────────────

  private async handleCommentEvent(value: any) {
    const commentText = this.normalize(value.text || '');
    const commentId: string = value.id;
    const mediaId: string = value.media?.id;
    const senderIgId: string = value.from?.id;
    const igUsername: string = value.from?.username;
    if (!commentId || !mediaId) return;

    const automations = await this.repo.find({ where: { postId: mediaId, isActive: true } });

    for (const auto of automations) {
      const matches = auto.acceptAny || commentText.includes(this.normalize(auto.keyword || 'eu quero'));
      if (!matches) continue;

      if (auto.captureConfirmation && senderIgId) {
        // Passo 1: enviar quick reply de confirmação
        const question = auto.confirmationQuestion || 'Quer receber o material gratuito? 👇';
        await this.sendQuickReply(senderIgId, question);

        // Criar/resetar conversa no passo waiting_confirmation
        await this.upsertConversation(senderIgId, igUsername, auto.id, 'waiting_confirmation');
      } else if (auto.captureEmail && senderIgId) {
        // Pula confirmação, vai direto pedir email
        const question = auto.emailQuestion || 'Oi! Qual é o seu melhor email? 😊';
        await this.sendDmToUser(senderIgId, question);
        await this.upsertConversation(senderIgId, igUsername, auto.id, 'waiting_email');
      } else {
        // Fluxo direto: envia DM com link
        await this.sendDm(commentId, auto.replyMessage, auto.dmButtonLabel);
      }

      if (auto.commentReply) {
        await this.replyToComment(commentId, auto.commentReply);
      }
      await this.repo.increment({ id: auto.id }, 'triggeredCount', 1);
      this.logger.log(`Automação "${auto.id}" disparada`);
    }
  }

  // ─── Resposta via DM ─────────────────────────────────────────────────────────

  private async handleMessagingEvent(messaging: any) {
    // Ignora ecos (mensagens enviadas pela própria conta)
    if (messaging.is_echo) return;

    const senderIgId: string = messaging.sender?.id;
    const text: string = messaging.message?.text?.trim();
    const quickReplyPayload: string = messaging.message?.quick_reply?.payload;
    if (!senderIgId || !text) return;

    this.logger.log(`DM de ${senderIgId}: "${text}" | payload: ${quickReplyPayload}`);

    // Busca conversa ativa mais recente
    const conv = await this.convRepo.findOne({
      where: { senderIgId },
      order: { updatedAt: 'DESC' },
    });
    if (!conv || conv.step === 'completed') return;

    const auto = await this.repo.findOneBy({ id: conv.automationId });

    // ── Passo: esperando confirmação (Yes/No) ──
    if (conv.step === 'waiting_confirmation') {
      const isYes = quickReplyPayload === 'CONFIRM_YES' || /^(s|si|sim|yes|quero|ok|vai|bora)$/i.test(this.normalize(text));
      const isNo = quickReplyPayload === 'CONFIRM_NO' || /^(n|nao|no|nope|nã)/.test(this.normalize(text));

      if (isYes) {
        if (auto?.captureEmail) {
          const question = auto.emailQuestion || 'Ótimo! Qual é o seu melhor email? 😊';
          await this.sendDmToUser(senderIgId, question);
          await this.convRepo.update(conv.id, { step: 'waiting_email' });
        } else {
          // Sem captura de email: envia o link direto
          if (auto?.replyMessage) await this.sendDmToUser(senderIgId, auto.replyMessage, auto.dmButtonLabel);
          await this.convRepo.update(conv.id, { step: 'completed' });
        }
      } else if (isNo) {
        await this.sendDmToUser(senderIgId, 'Tudo bem! Se mudar de ideia é só me chamar 😊');
        await this.convRepo.update(conv.id, { step: 'completed' });
      }
      // Se não for nem sim nem não, ignora (pode ser outra mensagem aleatória)
      return;
    }

    // ── Passo: esperando email ──
    if (conv.step === 'waiting_email') {
      if (!this.isValidEmail(text)) {
        await this.sendDmToUser(senderIgId, 'Hmm, não parece um email válido 🤔 Pode me mandar novamente? Ex: nome@gmail.com');
        return;
      }

      const email = text.toLowerCase().trim();
      await this.saveLead(email, conv);

      if (auto?.replyMessage) {
        await this.sendDmToUser(senderIgId, auto.replyMessage, auto.dmButtonLabel);
      } else {
        await this.sendDmToUser(senderIgId, 'Perfeito! Em breve você receberá mais informações 🙌');
      }

      await this.convRepo.update(conv.id, { step: 'completed', email });
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async upsertConversation(senderIgId: string, igUsername: string, automationId: string, step: string) {
    const existing = await this.convRepo.findOne({ where: { senderIgId, automationId } });
    if (!existing) {
      await this.convRepo.save(this.convRepo.create({ senderIgId, igUsername, automationId, step }));
    } else {
      await this.convRepo.update(existing.id, { step, email: undefined, igUsername });
    }
  }

  private async saveLead(email: string, conv: IgConversation) {
    try {
      const existing = await this.leadRepo.findOne({ where: { email } });
      if (!existing) {
        await this.leadRepo.save(
          this.leadRepo.create({
            name: conv.igUsername || `ig_${conv.senderIgId}`,
            email,
            phone: `ig_${conv.senderIgId}`,
            instagram: conv.igUsername,
            utmSource: 'instagram',
            utmMedium: 'dm-automation',
            status: 'novo',
            classification: 'frio',
            score: 0,
          }),
        );
        this.logger.log(`Lead criado via IG DM: ${email}`);
      } else {
        this.logger.log(`Lead já existe: ${email}`);
      }
    } catch (err) {
      this.logger.error(`Erro ao salvar lead: ${err.message}`);
    }
  }

  private async sendQuickReply(senderIgId: string, text: string) {
    const igUserId = await this.getIgUserId();
    try {
      await axios.post(
        `${IG_API}/${igUserId}/messages`,
        {
          recipient: { id: senderIgId },
          message: {
            text,
            quick_replies: [
              { content_type: 'text', title: 'Sim, quero! ✅', payload: 'CONFIRM_YES' },
              { content_type: 'text', title: 'Não, obrigado', payload: 'CONFIRM_NO' },
            ],
          },
        },
        { params: { access_token: this.igToken } },
      );
      this.logger.log(`Quick reply enviado para ${senderIgId}`);
    } catch (err) {
      this.logger.error(`Erro ao enviar quick reply: ${err.message}`);
    }
  }

  private async sendDmToUser(senderIgId: string, message: string, buttonLabel?: string) {
    const igUserId = await this.getIgUserId();
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    const url = urlMatch?.[0];

    let messagePayload: any;
    if (buttonLabel && url) {
      const textWithoutUrl = message.replace(url, '').trim();
      messagePayload = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: textWithoutUrl || message,
            buttons: [{ type: 'web_url', url, title: buttonLabel }],
          },
        },
      };
    } else {
      messagePayload = { text: message };
    }

    try {
      await axios.post(
        `${IG_API}/${igUserId}/messages`,
        { recipient: { id: senderIgId }, message: messagePayload },
        { params: { access_token: this.igToken } },
      );
      this.logger.log(`DM enviado para ${senderIgId}`);
    } catch (err) {
      this.logger.error(`Erro ao enviar DM: ${err.message}`);
    }
  }

  private async replyToComment(commentId: string, message: string) {
    try {
      await axios.post(
        `${IG_API}/${commentId}/replies`,
        { message },
        { params: { access_token: this.igToken } },
      );
      this.logger.log(`Resposta pública postada no comentário ${commentId}`);
    } catch (err) {
      this.logger.error(`Erro ao responder comentário: ${err.message}`);
    }
  }

  private async sendDm(commentId: string, message: string, buttonLabel?: string) {
    const igUserId = await this.getIgUserId();
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    const url = urlMatch?.[0];

    let messagePayload: any;
    if (buttonLabel && url) {
      const textWithoutUrl = message.replace(url, '').trim();
      messagePayload = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: textWithoutUrl || message,
            buttons: [{ type: 'web_url', url, title: buttonLabel }],
          },
        },
      };
    } else {
      messagePayload = { text: message };
    }

    try {
      await axios.post(
        `${IG_API}/${igUserId}/messages`,
        { recipient: { comment_id: commentId }, message: messagePayload },
        { params: { access_token: this.igToken } },
      );
      this.logger.log(`DM enviado para comentário ${commentId}`);
    } catch (err) {
      this.logger.error(`Erro ao enviar DM: ${err.message}`);
    }
  }
}
