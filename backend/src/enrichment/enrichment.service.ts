import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LeadsService } from '../leads/leads.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';
import { MessagingService } from '../messaging/messaging.service';
import { Lead, EnrichmentData } from '../common/entities/lead.entity';

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly rapidapiKey: string;
  private readonly rapidapiHost: string;

  constructor(
    private config: ConfigService,
    private leadsService: LeadsService,
    private aiAnalysisService: AiAnalysisService,
    private messagingService: MessagingService,
  ) {
    this.rapidapiKey = config.get('RAPIDAPI_KEY') || '';
    this.rapidapiHost = config.get('RAPIDAPI_HOST') || 'instagram120.p.rapidapi.com';
  }

  async enrichLeadFromInstagram(leadId: string): Promise<Lead> {
    const lead = await this.leadsService.findById(leadId);

    if (!lead.instagram) {
      this.logger.warn(`Lead ${leadId} não tem Instagram`);
      return lead;
    }

    try {
      const handle = lead.instagram.replace(/^@/, '');
      const enrichmentData = await this.fetchInstagramData(handle);
      const posts = await this.fetchInstagramPosts(handle);

      enrichmentData.posts = posts;

      const bonusScore = enrichmentData.enrichment_bonus || 0;
      const newScore = lead.score + bonusScore;

      const aiInsight = await this.aiAnalysisService.analyzeLeadInstagram(
        lead.name,
        lead.instagram,
        enrichmentData.followers || 0,
        enrichmentData.engagement_rate || 0,
        enrichmentData.content_type || '',
        posts,
      );

      const updated = await this.leadsService.update(leadId, {
        enrichmentData,
        aiInsight,
        score: newScore,
      });

      this.logger.log(`Lead ${leadId} enriquecido: +${bonusScore}pts (total: ${newScore})`);

      // Enviar mensagem enriquecida via WhatsApp
      this.sendEnrichedMessage(updated, aiInsight).catch(err =>
        this.logger.error(`Erro ao enviar mensagem enriquecida: ${err.message}`),
      );

      return updated;
    } catch (err) {
      this.logger.error(`Erro ao enriquecer lead ${leadId}: ${err.message}`);
      throw err;
    }
  }

  private async fetchInstagramData(handle: string): Promise<EnrichmentData> {
    const headers = {
      'x-rapidapi-key': this.rapidapiKey,
      'x-rapidapi-host': this.rapidapiHost,
      'Content-Type': 'application/json',
    };

    // Tenta endpoint principal /profile
    try {
      const response = await axios.post(
        `https://${this.rapidapiHost}/api/instagram/profile`,
        { username: handle },
        { headers },
      );
      const data = response.data.result;
      const followers = data.edge_followed_by?.count || 0;
      const posts = data.edge_owner_to_timeline_media?.count || 0;
      return {
        followers,
        engagement_rate: followers > 0 ? posts / followers : 0,
        content_type: data.biography || '',
        recent_stories: [],
        enrichment_bonus: 0,
      };
    } catch {
      this.logger.warn(`/profile falhou para ${handle}, tentando /userInfo`);
    }

    // Fallback: /userInfo
    try {
      const response = await axios.post(
        `https://${this.rapidapiHost}/api/instagram/userInfo`,
        { username: handle },
        { headers },
      );
      const data = response.data?.result?.[0]?.user;
      if (!data) throw new Error('userInfo sem dados');
      const followers = data.follower_count || 0;
      const posts = data.media_count || 0;
      return {
        followers,
        engagement_rate: followers > 0 ? posts / followers : 0,
        content_type: data.biography || '',
        recent_stories: [],
        enrichment_bonus: 0,
      };
    } catch (err: any) {
      this.logger.error(`RapidAPI error: ${err.message}`);
      throw new Error('Falha ao buscar dados do Instagram');
    }
  }

  private async fetchInstagramPosts(handle: string): Promise<any[]> {
    try {
      const response = await axios.post(
        `https://${this.rapidapiHost}/api/instagram/posts`,
        { username: handle, maxId: '' },
        {
          headers: {
            'x-rapidapi-key': this.rapidapiKey,
            'x-rapidapi-host': this.rapidapiHost,
            'Content-Type': 'application/json',
          },
        },
      );

      const edges = response.data.result?.edges || [];
      return edges.slice(0, 3).map((edge: any) => {
        const node = edge.node;
        const imageUrl = node.image_versions2?.candidates?.[0]?.url || '';
        return {
          code: node.code,
          caption: node.caption?.text || '',
          takenAt: node.taken_at,
          imageUrl,
          commentCount: node.comment_count || 0,
          likeCount: node.like_count || 0,
        };
      });
    } catch (err: any) {
      this.logger.error(`RapidAPI posts error: ${err.message}`);
      return [];
    }
  }

  private async sendEnrichedMessage(lead: Lead, aiInsight: any): Promise<void> {
    if (!lead.phone || !aiInsight?.outreach_message) {
      return;
    }

    try {
      await this.messagingService.sendMessage({
        leadId: lead.id,
        text: aiInsight.outreach_message,
      });
    } catch (err: any) {
      this.logger.warn(`Não foi possível enviar mensagem enriquecida: ${err.message}`);
    }
  }

  async generateFollowupForLead(leadId: string): Promise<{ message: string; hasStories: boolean; storiesCount: number }> {
    const lead = await this.leadsService.findById(leadId);

    let stories: any[] = [];
    if (lead.instagram) {
      const handle = lead.instagram.replace(/^@/, '');
      stories = await this.fetchInstagramStories(handle);
    }

    const analyzedStories = stories.length > 0
      ? await this.aiAnalysisService.analyzeStoryImages(stories)
      : [];

    const message = await this.aiAnalysisService.generateFollowupMessage(lead, analyzedStories);
    return { message, hasStories: stories.length > 0, storiesCount: stories.length };
  }

  async sendFollowupMessage(leadId: string, message: string): Promise<{ sent: boolean }> {
    await this.messagingService.sendMessage({ leadId, text: message });
    return { sent: true };
  }

  private async fetchInstagramStories(handle: string): Promise<any[]> {
    try {
      const response = await axios.post(
        `https://${this.rapidapiHost}/api/instagram/stories`,
        { username: handle },
        {
          headers: {
            'x-rapidapi-key': this.rapidapiKey,
            'x-rapidapi-host': this.rapidapiHost,
            'Content-Type': 'application/json',
          },
        },
      );

      const items: any[] = response.data?.result || [];
      return items.slice(0, 5).map((story: any) => ({
        takenAt: story.taken_at,
        mediaType: story.media_type === 2 ? 'video' : 'foto',
        caption: story.caption?.text || '',
        imageUrl: story.image_versions2?.candidates?.[0]?.url || '',
      }));
    } catch (err: any) {
      this.logger.warn(`Stories indisponíveis para ${handle} (provavelmente conta privada): ${err.message}`);
      return [];
    }
  }

}
