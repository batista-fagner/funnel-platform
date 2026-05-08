import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHash } from 'crypto';
import { Lead } from '../common/entities/lead.entity';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(private config: ConfigService) {}

  private sha256(value: string): string {
    return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
  }

  private buildFbc(fbclid: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    return `fb.1.${timestamp}.${fbclid}`;
  }

  private buildUserData(lead: Lead): Record<string, string> {
    const userData: Record<string, string> = {};
    if (lead.email) userData['em'] = this.sha256(lead.email);
    if (lead.phone) userData['ph'] = this.sha256(`55${lead.phone.replace(/\D/g, '')}`);
    if (lead.name) userData['fn'] = this.sha256(lead.name.split(' ')[0]);
    if (lead.fbclid) userData['fbc'] = this.buildFbc(lead.fbclid);
    if (lead.id) userData['external_id'] = lead.id;
    return userData;
  }

  private async sendEvent(eventName: string, userData: Record<string, string>, customData?: Record<string, any>): Promise<void> {
    const pixelId = this.config.get('FB_PIXEL_ID');
    const accessToken = this.config.get('FB_ACCESS_TOKEN');

    if (!pixelId || !accessToken) {
      this.logger.warn('FB_PIXEL_ID ou FB_ACCESS_TOKEN não configurados — evento não enviado');
      return;
    }

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          user_data: userData,
          ...(customData ? { custom_data: customData } : {}),
        },
      ],
    };

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/${pixelId}/events`,
        payload,
        { params: { access_token: accessToken } },
      );
      this.logger.log(`Evento "${eventName}" enviado ao Facebook`);
    } catch (err) {
      this.logger.error(`Erro ao enviar evento "${eventName}" ao Facebook: ${err.message}`);
    }
  }

  async getAdCreative(adId: string): Promise<any> {
    const accessToken = this.config.get('FB_ADS_TOKEN');
    const adAccountId = this.config.get('FB_AD_ACCOUNT_ID');
    if (!accessToken) throw new Error('FB_ADS_TOKEN não configurado');

    // Busca o anúncio com creative e asset_feed_spec para pegar hashes de imagem
    const adResponse = await axios.get(`https://graph.facebook.com/v21.0/${adId}`, {
      params: {
        fields: 'name,creative{thumbnail_url,title,body,asset_feed_spec}',
        access_token: accessToken,
      },
    });

    const data = adResponse.data;
    const imageHash = data.creative?.asset_feed_spec?.images?.[0]?.hash;

    // Se tem hash e account ID, busca a imagem em alta resolução
    if (imageHash && adAccountId) {
      try {
        const imgResponse = await axios.get(`https://graph.facebook.com/v21.0/${adAccountId}/adimages`, {
          params: {
            hashes: JSON.stringify([imageHash]),
            fields: 'url,width,height',
            access_token: accessToken,
          },
        });
        const fullImage = imgResponse.data?.data?.[0];
        if (fullImage?.url) {
          data.creative.image_url = fullImage.url;
          data.creative.image_width = fullImage.width;
          data.creative.image_height = fullImage.height;
        }
      } catch {
        // fallback para thumbnail se falhar
      }
    }

    return data;
  }

  async sendLeadEvent(lead: Lead, extra?: { fbp?: string; userAgent?: string; clientIp?: string }): Promise<void> {
    const userData = this.buildUserData(lead);
    if (extra?.fbp) userData['fbp'] = extra.fbp;
    if (extra?.clientIp) userData['client_ip_address'] = extra.clientIp;
    if (extra?.userAgent) userData['client_user_agent'] = extra.userAgent;
    await this.sendEvent('Lead', userData);
  }

  async sendPurchaseEvent(lead: Lead, value: number): Promise<void> {
    const userData = this.buildUserData(lead);
    await this.sendEvent('Purchase', userData, { value, currency: 'BRL' });
  }
}
