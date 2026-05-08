import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';
import { Post, Lead } from '../common/entities/lead.entity';

export interface LeadInsight {
  niche: string;
  engagement_level: string;
  audience_profile: string;
  content_pattern: string;
  selling_angle: string;
  outreach_message: string;
  confidence_score: number;
}

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    const apiKey = config.get('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeLeadInstagram(
    name: string,
    instagram: string,
    followers: number,
    engagementRate: number,
    biography: string,
    posts: Post[],
  ): Promise<LeadInsight> {
    try {
      const postsData = posts
        .map(
          (p) =>
            `Post: "${p.caption.substring(0, 150)}..." | Curtidas: ${p.likeCount} | Comentários: ${p.commentCount}`,
        )
        .join('\n');

      const firstName = name.split(' ')[0];

      const prompt = `Você é um especialista em análise de perfis do Instagram e funis de vendas com IA. Analise o perfil abaixo e gere insights estratégicos + a primeira mensagem de WhatsApp do Efraim (assistente do Fagner).

PERFIL:
Nome: ${name} (chame apenas de ${firstName})
Instagram: ${instagram}
Seguidores: ${followers.toLocaleString()}
Engajamento: ${(engagementRate * 100).toFixed(2)}%
Bio: "${biography}"

POSTS RECENTES:
${postsData}

---

REGRAS PARA outreach_message — MSG 1 DO EFRAIM:

Você é Efraim, assistente de Fagner no WhatsApp. Essa é a PRIMEIRA mensagem que o lead recebe após se inscrever na aula "Como implementar funil com IA do zero".

ESTRUTURA OBRIGATÓRIA (3 linhas curtas):
Linha 1: abertura casual — "faaala ${firstName}.. efraim aqui da equipe do Fagner"
Linha 2: mencione algo ESPECÍFICO do negócio/nicho/conteúdo dele com base no perfil — "vi que você trabalha com [X], que interessante"
Linha 3: pergunta aberta sobre o negócio — "me conta.. qual é tua maior dificuldade hoje com [contexto do nicho]?"

TOM:
- Coloquial, como amigo no WhatsApp: "cara", "show", "faz sentido", "que legal"
- Reticências (".." ou "...") para dar ritmo natural
- Sem emojis ou no máximo 1
- Nunca formal, nunca técnico demais
- Máximo 3 linhas curtas

ERROS A EVITAR:
❌ "Parabéns pelo seu negócio!" (genérico demais)
❌ "Vamos explorar como a IA pode..." (corporativo)
❌ Parágrafos longos
❌ Qualquer frase que poderia ser enviada para qualquer pessoa

EXEMPLO para finanças pessoais com 14k seguidores:
"faaala João.. efraim aqui da equipe do Fagner
vi que você ensina finanças pessoais.. conteúdo importante demais
me conta.. qual é tua maior dificuldade hoje pra converter seus seguidores em clientes?"

Responda APENAS com este JSON, sem markdown:
{
  "niche": "segmento específico (ex: fisioterapia, e-commerce moda, coaching fitness)",
  "engagement_level": "baixo/médio/alto",
  "audience_profile": "descrição concreta do público (ex: mulheres 30-50 buscando rejuvenescimento natural)",
  "content_pattern": "padrão real dos posts (ex: storytelling emocional + antes/depois + provas sociais)",
  "selling_angle": "gargalo específico do funil desse negócio (máx 100 chars)",
  "outreach_message": "MSG 1 do Efraim — 3 linhas curtas separadas por \\n, coloquial, específica para o negócio dele, termina com pergunta aberta",
  "confidence_score": 0-100
}`;

      const response = await this.openai.chat.completions.create({
        // model: 'gpt-4o-mini',
        model: 'gpt-5.4-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_completion_tokens: 500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return this.getDefaultInsight();
      }
      const insight = JSON.parse(content) as LeadInsight;

      this.logger.log(`Lead ${name} analisado com sucesso`);
      return insight;
    } catch (err: any) {
      this.logger.error(`Erro ao analisar lead: ${err.message}`);
      return this.getDefaultInsight();
    }
  }

  async analyzeStoryImages(stories: { imageUrl: string; mediaType: string; caption: string }[]): Promise<{ mediaType: string; caption: string; description: string }[]> {
    const results = await Promise.all(
      stories.map(async (story) => {
        if (!story.imageUrl) {
          return { mediaType: story.mediaType, caption: story.caption, description: '' };
        }
        try {
          const imgResponse = await axios.get(story.imageUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://www.instagram.com/',
            },
            timeout: 10000,
          });
          const base64 = Buffer.from(imgResponse.data).toString('base64');
          const mimeType = imgResponse.headers['content-type'] || 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${base64}`;

          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: dataUrl, detail: 'low' },
                },
                {
                  type: 'text',
                  text: story.mediaType === 'video'
                    ? 'Essa é a thumbnail de um vídeo/reels do Instagram Story. Descreva em 1-2 frases: tema do conteúdo, ambiente, o que a pessoa está fazendo ou mostrando, textos visíveis na tela. Seja objetivo e direto.'
                    : 'Esse é um story do Instagram. Descreva em 1-2 frases: tema principal, o que aparece na imagem, textos visíveis, produto ou serviço mostrado, tom emocional. Seja objetivo e direto.',
                },
              ],
            }],
            max_tokens: 120,
          });
          const description = response.choices[0].message.content?.trim() || '';
          this.logger.log(`Story analisado: ${description.slice(0, 60)}...`);
          return { mediaType: story.mediaType, caption: story.caption, description };
        } catch (err: any) {
          this.logger.warn(`Falha ao analisar imagem do story: ${err.message}`);
          return { mediaType: story.mediaType, caption: story.caption, description: '' };
        }
      }),
    );
    return results;
  }

  async generateFollowupMessage(lead: Lead, stories: { mediaType: string; caption: string; description: string }[]): Promise<string> {
    const firstName = lead.name.split(' ')[0];
    const insight = lead.aiInsight;
    const hasStories = stories.length > 0;

    const storiesContext = hasStories
      ? `STORIES RECENTES (${stories.length} stories — analisados por visão computacional):\n${stories.map((s, i) => {
          const lines = [`Story ${i + 1} (${s.mediaType})`];
          if (s.description) lines.push(`  Conteúdo visual: ${s.description}`);
          if (s.caption) lines.push(`  Legenda: "${s.caption}"`);
          return lines.join('\n');
        }).join('\n')}`
      : 'Conta privada ou sem stories ativos no momento.';

    const leadContext = insight
      ? `Nicho: ${insight.niche}\nNível de engajamento: ${insight.engagement_level}\nPúblico: ${insight.audience_profile}\nAngulo de venda identificado: ${insight.selling_angle}`
      : `Nome: ${lead.name}\nInstagram: ${lead.instagram || 'não informado'}\nEmail: ${lead.email || 'não informado'}`;

    const prompt = `Você é Efraim, assistente de Fagner no WhatsApp. O lead ${firstName} já recebeu a primeira mensagem e você quer fazer um follow-up personalizado${hasStories ? ' baseado nos stories que ele postou recentemente' : ''}.

CONTEXTO DO LEAD:
${leadContext}

${storiesContext}

REGRAS PARA O FOLLOW-UP:
- É uma mensagem de follow-up, não a primeira abordagem
- ${hasStories ? 'Use a descrição visual do story para ser MUITO específico: mencione o que a pessoa estava fazendo ou mostrando, de forma natural e sem parecer stalker' : 'Como o perfil é privado, use o que você sabe do nicho e do lead para personalizar'}
- Tom coloquial e casual, como amigo no WhatsApp
- Máximo 3 linhas curtas
- Use reticências (".." ou "...") para ritmo natural
- Sem emojis ou no máximo 1
- Termine com uma pergunta ou gancho leve, não agressivo
- Nunca mencione "follow-up" ou que está fazendo contato de novo explicitamente

EXEMPLO (com stories):
"oi ${firstName}.. vi seu story de hoje
gostei do [conteúdo do story].. faz muito sentido pro seu público
e aí, ficou alguma dúvida sobre o que conversamos?"

EXEMPLO (sem stories / conta privada):
"oi ${firstName}.. passando aqui pra saber se ficou alguma dúvida
sobre o que a gente conversou antes
como tá indo o [contexto do nicho]?"

Responda APENAS com o texto da mensagem, sem aspas, sem JSON, sem explicações.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_completion_tokens: 200,
      });

      return response.choices[0].message.content?.trim() || 'oi, passando pra saber se ficou alguma dúvida sobre o que conversamos!';
    } catch (err: any) {
      this.logger.error(`Erro ao gerar followup: ${err.message}`);
      return 'oi, passando pra saber se ficou alguma dúvida sobre o que conversamos!';
    }
  }

  private getDefaultInsight(): LeadInsight {
    return {
      niche: 'Não identificado',
      engagement_level: 'Dados insuficientes',
      audience_profile: 'Análise não disponível',
      content_pattern: 'Análise não disponível',
      selling_angle: 'Abordagem manual recomendada',
      outreach_message:
        'Olá! Vimos seu conteúdo e gostaríamos de conversar sobre uma oportunidade.',
      confidence_score: 0,
    };
  }
}
