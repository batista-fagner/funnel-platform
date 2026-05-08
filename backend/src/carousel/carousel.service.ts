import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';
import * as puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { Carousel, SlideData } from './carousel.entity';

const IG_API = 'https://graph.instagram.com/v21.0';

const TONE_LABELS: Record<string, string> = {
  educativo: 'educativo e informativo',
  provocativo: 'provocativo e questionador',
  storytelling: 'narrativo com storytelling',
  case: 'baseado em case ou prova social',
};

@Injectable()
export class CarouselService {
  private readonly logger = new Logger(CarouselService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(Carousel)
    private repo: Repository<Carousel>,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  private get igToken() {
    return this.config.get<string>('IG_TOKEN');
  }

  private get supabase() {
    return createClient(
      this.config.get<string>('SUPABASE_URL')!,
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  private async getIgUserId(): Promise<string> {
    const stored = this.config.get<string>('IG_USER_ID');
    if (stored) return stored;
    const res = await axios.get(`${IG_API}/me`, {
      params: { fields: 'id', access_token: this.igToken },
    });
    return res.data.id;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const carousel = await this.repo.findOneBy({ id });
    if (!carousel) throw new NotFoundException('Carrossel não encontrado');
    return carousel;
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }

  // ─── Criação + geração de copy ────────────────────────────────────────────────

  async create(dto: { topic: string; tone: string; slideCount: number; instagramHandle?: string }) {
    const carousel = this.repo.create({
      topic: dto.topic,
      tone: dto.tone,
      slideCount: dto.slideCount,
      instagramHandle: dto.instagramHandle ?? null,
      status: 'draft',
      slides: [],
    });
    await this.repo.save(carousel);

    const slides = await this.generateCopy(dto.topic, dto.tone, dto.slideCount);
    carousel.slides = slides;
    carousel.status = 'text_ready';
    return this.repo.save(carousel);
  }

  private async generateCopy(topic: string, tone: string, slideCount: number): Promise<SlideData[]> {
    const response = await this.openai.chat.completions.create({
      model: /* TODO PROD: trocar para 'gpt-5.4-mini' */ 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é especialista em criação de conteúdo para Instagram.
Crie ${slideCount} slides para um carrossel sobre: "${topic}".
Tom: ${TONE_LABELS[tone] || tone}.

REGRAS:
- Slide 1: gancho forte e impactante (máx 3 linhas curtas)
- Slides 2 a ${slideCount - 1}: insights práticos e diretos (2-4 linhas cada)
- Slide ${slideCount}: CTA claro e direto
- Linguagem direta, sem emojis em excesso
- Use → para listas quando fizer sentido

Responda SOMENTE com JSON válido (sem markdown):
[{"index": 0, "text": "..."}, {"index": 1, "text": "..."}, ...]`,
        },
      ],
      temperature: 0.8,
      max_completion_tokens: 1500,
    });

    let raw = response.choices[0].message.content?.trim() ?? '[]';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(raw) as { index: number; text: string }[];

    return parsed.map(s => ({
      index: s.index,
      text: s.text,
      imagePrompt: '',
      imageUrl: null,
      imageStatus: 'pending' as const,
      finalSlideUrl: null,
    }));
  }

  // ─── Atualizar slides (revisão manual) ───────────────────────────────────────

  async updateSlides(id: string, slides: SlideData[]) {
    const carousel = await this.findOne(id);
    carousel.slides = slides;
    return this.repo.save(carousel);
  }

  // ─── Geração de imagem por slide ─────────────────────────────────────────────

  async generateImage(id: string, slideIndex: number) {
    const carousel = await this.findOne(id);
    const slideIdx = carousel.slides.findIndex(s => s.index === slideIndex);
    if (slideIdx === -1) throw new NotFoundException(`Slide ${slideIndex} não encontrado`);

    const slides = [...carousel.slides];
    slides[slideIdx] = { ...slides[slideIdx], imageStatus: 'generating' };
    carousel.slides = slides;
    await this.repo.save(carousel);

    try {
      const slide = slides[slideIdx];

      // 1. Gera prompt da imagem a partir do texto do slide
      const imagePrompt = await this.buildImagePrompt(slide.text);
      slides[slideIdx].imagePrompt = imagePrompt;

      // 2. Gera imagem com DALL-E 3 (portrait 9:16, mais espaço vertical)
      // TODO PROD: trocar para model: 'dall-e-3', size: '1024x1792'
      const imageResponse = await this.openai.images.generate({
        model: 'dall-e-2',
        prompt: imagePrompt,
        size: '512x512',
        n: 1,
      });
      const tempUrl = imageResponse.data?.[0]?.url;
      if (!tempUrl) throw new Error('DALL-E não retornou URL de imagem');

      // 3. Download e upload para Supabase Storage
      const imageBuffer = await this.downloadImage(tempUrl);
      const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET') || 'carousel-images';
      const imageUrl = await this.uploadToSupabase(bucket, `${id}/slide-${slideIndex}.png`, imageBuffer, 'image/png');
      slides[slideIdx].imageUrl = imageUrl;

      // 4. Renderiza slide final (template HTML → PNG via Puppeteer)
      const finalBuffer = await this.renderSlide({ ...slides[slideIdx], imageUrl }, carousel);
      const finalUrl = await this.uploadToSupabase(bucket, `${id}/final-${slideIndex}.png`, finalBuffer, 'image/png');
      slides[slideIdx].finalSlideUrl = finalUrl;
      slides[slideIdx].imageStatus = 'done';

      this.logger.log(`Slide ${slideIndex} gerado: ${finalUrl}`);
    } catch (err: any) {
      this.logger.error(`Erro ao gerar slide ${slideIndex}: ${err.message}`);
      slides[slideIdx].imageStatus = 'error';
    }

    carousel.slides = slides;
    if (slides.every(s => s.imageStatus === 'done')) carousel.status = 'images_ready';
    return this.repo.save(carousel);
  }

  async generateAllImages(id: string) {
    const carousel = await this.findOne(id);
    for (const slide of carousel.slides) {
      if (slide.imageStatus !== 'done') {
        await this.generateImage(id, slide.index);
      }
    }
    return this.findOne(id);
  }

  private async buildImagePrompt(text: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: /* TODO PROD: trocar para 'gpt-5.4-mini' */ 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Slide de Instagram:
"${text}"

Crie um prompt em inglês para o DALL-E gerar uma imagem que ilustre visualmente este conceito.
Regras: fotorrealista, sem texto, sem pessoas reconhecíveis, foco em ambiente/objetos/metáforas visuais, iluminação natural.
Responda APENAS com o prompt, sem explicações.`,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 150,
    });
    return response.choices[0].message.content?.trim()
      ?? 'Minimalist photo, clean background, natural lighting, high quality';
  }

  // ─── Puppeteer — template HTML → PNG (4:5 = 1080×1350) ───────────────────────

  private async renderSlide(slide: SlideData, carousel: Carousel): Promise<Buffer> {
    const name = this.config.get<string>('IG_PROFILE_NAME') || 'Fagner Batista';
    const handle = carousel.instagramHandle || this.config.get<string>('IG_PROFILE_HANDLE') || 'fagnerbatista';
    const avatar = this.config.get<string>('IG_PROFILE_AVATAR_URL') || '';

    const safeText = slide.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatarHtml = avatar
      ? `<img class="avatar" src="${avatar}" onerror="this.style.display='none';document.getElementById('avatar-fallback').style.display='flex';" />
         <div class="avatar avatar-fallback" id="avatar-fallback" style="display:none">${initials}</div>`
      : `<div class="avatar avatar-fallback">${initials}</div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1080px;
  height: 1350px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  padding: 64px;
}
.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 44px;
  flex-shrink: 0;
}
.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e2e8f0;
  background: #e2e8f0;
  flex-shrink: 0;
}
.avatar-fallback {
  background: #7c3aed;
  color: white;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-name { font-size: 30px; font-weight: 700; color: #0f172a; line-height: 1.2; }
.profile-handle { font-size: 20px; color: #94a3b8; margin-top: 5px; }
.text {
  font-size: 46px;
  line-height: 2.0;
  color: #1e293b;
  flex-shrink: 0;
  flex: 1;
  margin-bottom: 44px;
}
.image-wrap {
  height: 380px;
  flex-shrink: 0;
  border-radius: 24px;
  overflow: hidden;
}
.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
</head>
<body>
  <div class="header">
    ${avatarHtml}
    <div>
      <div class="profile-name">${name}</div>
      <div class="profile-handle">@${handle}</div>
    </div>
  </div>
  <div class="text">${safeText}</div>
  <div class="image-wrap">
    <img src="${slide.imageUrl}" />
  </div>
</body>
</html>`;

    const browser = await (puppeteer as any).launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1350 });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const buffer = await page.screenshot({ type: 'png', fullPage: false });
      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  // ─── Supabase Storage ─────────────────────────────────────────────────────────

  private async downloadImage(url: string): Promise<Buffer> {
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  }

  private async uploadToSupabase(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (error) throw new Error(`Supabase upload error: ${error.message}`);

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // ─── Publicação no Instagram (Graph API) ─────────────────────────────────────

  async publish(id: string) {
    const carousel = await this.findOne(id);
    const igUserId = await this.getIgUserId();
    const readySlides = carousel.slides.filter(s => s.finalSlideUrl);

    if (readySlides.length < 2) {
      throw new Error('O Instagram exige pelo menos 2 slides com imagem para publicar um carrossel');
    }

    // 1. Cria container para cada slide
    const creationIds: string[] = [];
    for (const slide of readySlides) {
      const res = await axios.post(`${IG_API}/${igUserId}/media`, null, {
        params: {
          image_url: slide.finalSlideUrl,
          is_carousel_item: true,
          access_token: this.igToken,
        },
      });
      creationIds.push(res.data.id);
      this.logger.log(`Container slide ${slide.index}: ${res.data.id}`);
    }

    // 2. Cria container do carrossel
    const carouselRes = await axios.post(`${IG_API}/${igUserId}/media`, null, {
      params: {
        media_type: 'CAROUSEL',
        children: creationIds.join(','),
        caption: carousel.topic,
        access_token: this.igToken,
      },
    });
    const carouselContainerId = carouselRes.data.id;
    this.logger.log(`Container carrossel: ${carouselContainerId}`);

    // 3. Publica
    const publishRes = await axios.post(`${IG_API}/${igUserId}/media_publish`, null, {
      params: {
        creation_id: carouselContainerId,
        access_token: this.igToken,
      },
    });

    carousel.igMediaId = publishRes.data.id;
    carousel.status = 'published';
    this.logger.log(`Carrossel publicado: ${carousel.igMediaId}`);
    return this.repo.save(carousel);
  }
}
