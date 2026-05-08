# Arquitetura Completa — funnel-platform

## Visão Geral

`funnel-platform` é um SaaS de gerenciamento de funil de vendas com rastreamento completo:

```
Ads (Meta)
    ↓
VSL (página com vídeo + pixel tracking)
    ↓
Formulário Qualificador (próprio)
    ↓
Scoring Automático (Ótimo/Bom/Frio)
    ↓
Email Automation (Resend)
    ↓
Dashboard de Métricas
```

---

## Stack

- **Backend:** NestJS 11, TypeORM, PostgreSQL (Supabase), Redis (Bull Queue)
- **Frontend:** React 18 + Vite + shadcn/ui
- **Tracking:** Pixel JS customizado
- **Email:** Resend (API)
- **Ads:** Meta Ads API
- **Auth:** JWT + Supabase Auth (opcional)
- **Messaging:** uazapi (WhatsApp) — R$ 29/mês
- **Lead Enrichment:** RapidAPI (Instagram Analysis) — pay-as-you-go

---

## Arquitetura de Pasta

```
funnel-platform/
├── ARCHITECTURE.md          ← você está aqui
├── ROADMAP.md               ← MVP vs Completo
├── backend/
│   ├── .env.example
│   ├── docker-compose.yml   ← Redis para Bull Queue
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── campaigns/
│   │   │   ├── campaigns.controller.ts
│   │   │   ├── campaigns.service.ts
│   │   │   └── campaigns.module.ts
│   │   ├── ads/
│   │   │   ├── ads.controller.ts
│   │   │   ├── ads.service.ts
│   │   │   └── ads.module.ts
│   │   ├── forms/
│   │   │   ├── forms.controller.ts
│   │   │   ├── forms.service.ts
│   │   │   ├── field.builder.ts  ← builder de campos
│   │   │   └── forms.module.ts
│   │   ├── tracking/
│   │   │   ├── tracking.controller.ts  ← POST /t (sem auth)
│   │   │   ├── tracking.service.ts
│   │   │   └── tracking.module.ts
│   │   ├── leads/
│   │   │   ├── leads.controller.ts
│   │   │   ├── leads.service.ts
│   │   │   ├── scoring.engine.ts  ← calcula score
│   │   │   └── leads.module.ts
│   │   ├── email/
│   │   │   ├── email.controller.ts
│   │   │   ├── email.service.ts
│   │   │   ├── email.queue.ts    ← Bull Queue
│   │   │   ├── resend.client.ts
│   │   │   └── email.module.ts
│   │   ├── meta/
│   │   │   ├── meta.controller.ts
│   │   │   ├── meta.service.ts
│   │   │   ├── meta-api.client.ts
│   │   │   └── meta.module.ts
│   │   ├── analytics/
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── analytics.module.ts
│   │   └── common/
│   │       └── entities/
│   │           ├── campaign.entity.ts
│   │           ├── ad.entity.ts
│   │           ├── form.entity.ts
│   │           ├── lead.entity.ts
│   │           ├── event.entity.ts
│   │           └── email-log.entity.ts
│   └── dist/
└── frontend/
    ├── .env.example
    ├── vite.config.js
    ├── package.json
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Campaigns/
        │   ├── CampaignDetail.jsx
        │   ├── Forms/
        │   ├── FormBuilder.jsx
        │   ├── Leads/
        │   ├── LeadDetail.jsx
        │   ├── EmailSequences/
        │   ├── Analytics/
        │   └── Settings.jsx
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Header.jsx
        │   ├── FunnelChart.jsx
        │   ├── LeadsTable.jsx
        │   └── MetricCard.jsx
        ├── services/
        │   └── api.js
        ├── hooks/
        │   └── useAuth.js
        └── styles/
            └── globals.css
```

---

## Fluxo de Dados Completo

### 1. Criação de Campanha

```
User cria campanha (frontend)
  → POST /campaigns (backend)
  → Salva em DB: campaigns.name, budget
  → Se Meta: GET /meta/campaigns (lê campanhas do Meta)
  → Retorna: campaign + meta_campaign_id
  → Frontend exibe em lista
```

### 2. Setup de VSL + Formulário

```
User coloca:
  - URL do vídeo da VSL (hospedado no Vimeo/YouTube)
  - Headline do CTA
  - Perguntas do formulário (drag & drop)
  
Salva em DB:
  - vsl_pages.video_url, headline, cta_text
  - forms.fields (JSONB com config de campos)
  
Sistema gera:
  - URL pública: /campaign/:campaignId/form
  - Pixel snippet: <script src="/pixel/:campaignId.js">
```

### 3. Lead Visita VSL

```
Lead clica no anúncio → vai para:
  https://seu-site.com/campaign/:campaignId/vsl?utm_source=meta&utm_medium=cpc

Página carrega pixel:
  <script src="https://seu-api.com/pixel/:campaignId.js">
  
Pixel fazuma POST /tracking/event:
  {
    campaign_id: "uuid",
    session_id: "xxx",  // fingerprint anônimo
    type: "page_load",
    utm_source: "meta",
    utm_medium: "cpc",
    utm_campaign: "...".
    timestamp
  }

Assiste vídeo:
  - 25% → POST /tracking/event { type: "vsl_25" }
  - 50% → POST /tracking/event { type: "vsl_50" }
  - 75% → POST /tracking/event { type: "vsl_75" }
  - 100% → POST /tracking/event { type: "vsl_100" }

Clica no CTA:
  - POST /tracking/event { type: "cta_click" }
  - Redireciona para: /campaign/:campaignId/form
```

### 4. Lead Preenche Formulário

```
Formulário abre:
  POST /tracking/event { type: "form_open" }

Lead preenche:
  - Nome
  - Email
  - Telefone
  - Faturamento
  - Desafios
  - Orçamento
  - Outros

Submete:
  POST /forms/:formId/submit
  {
    name, email, phone,
    responses: { faturamento: "30k-100k", ... }
  }
  
Backend:
  1. Calcula score via ScoringEngine
  2. Classifica: Ótimo/Bom/Frio
  3. Cria/atualiza Lead no DB
  4. Associa eventos anteriores ao lead (via session_id → email)
  5. POST /tracking/event { type: "form_submit" }
  6. Dispara Email Sequence via Bull Queue
  7. Retorna: thank_you_page
```

### 5. Email Automation

```
Bull Queue dispara:
  Email 1 (imediato):
    - Assunto: "Sua consulta foi agendada"
    - Template com {nome}, {link_calendario}
    - Resend envia

  Email 2 (1 dia depois):
    - Assunto: "Ainda está em dúvida?"
    - Webhook do Resend: opened_at, clicked_at

  Email 3 (3 dias depois):
    - Última oportunidade
    - Tracking completo
    
Salva em email_logs:
  - lead_id, sequence_id, email_index, status, sent_at, opened_at
```

### 6. Dashboard de Métricas

```
GET /analytics/funnel
  → % em cada etapa (impressões → cliques → VSL → form → converteu)

GET /campaigns/:id/analytics
  → Métricas agregadas dessa campanha
  → CPM, CPC, CTR (via Meta API)
  → Custo por lead, por conversão

GET /analytics/leads
  → Distribuição: quantos Ótimo/Bom/Frio
  → Tempo médio form → conversão
  → Taxa de abertura/clique dos emails
```

---

## Banco de Dados — Detalhado

### campaigns
```sql
id              UUID PK
name            VARCHAR
meta_campaign_id VARCHAR (opcional)
status          ENUM (ativa|pausada|concluida)
daily_budget    DECIMAL
objective       VARCHAR (LINK_CLICKS, CONVERSIONS, etc)
utm_campaign    VARCHAR (para pixel tracking)
created_at      TIMESTAMP
updated_at      TIMESTAMP
user_id         UUID FK (multi-tenant no futuro)
```

### vsl_pages
```sql
id              UUID PK
campaign_id     UUID FK
video_url       VARCHAR (Vimeo, YouTube)
headline        VARCHAR
cta_text        VARCHAR
cta_delay_seconds INT (delay antes de mostrar botão)
thank_you_url   VARCHAR (redireciona após conversão)
created_at      TIMESTAMP
```

### forms
```sql
id              UUID PK
campaign_id     UUID FK
name            VARCHAR
fields          JSONB (estrutura de campos)
  [
    { id: "q1", type: "select", label: "Faturamento", options: [...] },
    { id: "q2", type: "text", label: "Nome", ... }
  ]
thank_you_url   VARCHAR
created_at      TIMESTAMP
```

### leads
```sql
id              UUID PK
campaign_id     UUID FK
name            VARCHAR
email           VARCHAR UNIQUE per campaign
phone           VARCHAR
revenue_range   VARCHAR (de q1)
score           INT (calculado)
classification  ENUM (otimo|bom|frio)
status          ENUM (novo|contatado|convertido|perdido)
utm_source      VARCHAR
utm_medium      VARCHAR
utm_campaign    VARCHAR
vsl_percentage  INT (75 = assistiu 75%)
last_event_at   TIMESTAMP
created_at      TIMESTAMP
```

### events (transacional — volume alto!)
```sql
id              UUID PK
campaign_id     UUID FK
session_id      VARCHAR (fingerprint anônimo)
lead_id         UUID FK (null até form_submit)
type            ENUM (page_load|vsl_25|vsl_50|vsl_75|vsl_100|
                       cta_click|form_open|form_submit|
                       email_open|email_click|scheduled|converted)
metadata        JSONB ({ vsl_duration: 45, utm_params: {...} })
created_at      TIMESTAMP
```

### email_sequences
```sql
id              UUID PK
campaign_id     UUID FK
name            VARCHAR
is_active       BOOLEAN
emails          JSONB
  [
    {
      index: 0,
      subject: "Sua consulta foi agendada!",
      template: "welcome",
      delay_hours: 0,
      variables: [nome, email, link_calendario]
    },
    { index: 1, subject: "Ainda está em dúvida?", template: "doubt", delay_hours: 24 },
    ...
  ]
created_at      TIMESTAMP
```

### email_logs
```sql
id              UUID PK
lead_id         UUID FK
sequence_id     UUID FK
email_index     INT
recipient       VARCHAR
subject         VARCHAR
status          ENUM (pending|sent|opened|clicked|bounced)
sent_at         TIMESTAMP
opened_at       TIMESTAMP (null até abrir)
clicked_at      TIMESTAMP
resend_message_id VARCHAR
created_at      TIMESTAMP
```

---

## APIs Públicas (sem auth)

```
POST /tracking/event
  Body: { campaign_id, session_id, type, metadata, utms }
  Response: { ok: true }
  Nota: Rota crítica — otimizar para alto volume

GET /campaign/:campaignId/vsl
  Response: HTML com pixel snippet + vídeo

GET /campaign/:campaignId/form
  Response: Formulário HTML customizado

POST /campaign/:campaignId/form/submit
  Body: { name, email, phone, responses }
  Response: { ok: true, redirect_url: "..." }
```

---

## Pixel Tracking — Detalhes

Gerado dinamicamente em `/pixel/:campaignId.js`

```js
(function() {
  // UUID session para correlacionar eventos
  const sessionId = localStorage.getItem('_fp_sid') || generateUUID();
  localStorage.setItem('_fp_sid', sessionId);
  
  // Captura UTM params
  const params = new URLSearchParams(window.location.search);
  const utms = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  };
  
  // POST page_load
  track('page_load', utms);
  
  // Detecta vídeo e progresso
  if (window.Vimeo) {
    const iframe = document.querySelector('iframe[src*="vimeo"]');
    const player = new Vimeo.Player(iframe);
    
    player.on('play', () => track('vsl_play'));
    player.on('timeupdate', (data) => {
      const pct = data.percent * 100;
      if (pct >= 25 && !tracked25) { track('vsl_25'); tracked25 = true; }
      if (pct >= 50 && !tracked50) { track('vsl_50'); tracked50 = true; }
      if (pct >= 75 && !tracked75) { track('vsl_75'); tracked75 = true; }
    });
    player.on('ended', () => track('vsl_100'));
  }
  
  // CTA click
  document.querySelectorAll('[data-pixel-cta]').forEach(btn => {
    btn.addEventListener('click', () => track('cta_click'));
  });
  
  function track(type, extra = {}) {
    navigator.sendBeacon('/tracking/event', JSON.stringify({
      campaign_id: '{{ campaignId }}',
      session_id: sessionId,
      type,
      ...extra,
      timestamp: Date.now()
    }));
  }
})();
```

---

## ScoringEngine — Lógica

```typescript
class ScoringEngine {
  score(responses: FormResponses): { score: number; classification: string } {
    let pts = 0;
    
    // Faturamento
    if (responses.revenue === '100k+') pts += 50;
    else if (responses.revenue === '30k-100k') pts += 50;
    else if (responses.revenue === '10k-30k') pts += 25;
    else pts += 0;
    
    // Tem dor
    if (responses.has_pain) pts += 20;
    
    // Orçamento
    if (responses.budget >= 200) pts += 15;
    
    // Volume
    if (responses.monthly_patients >= 50) pts += 15;
    
    // Bonus: assistiu > 75% VSL
    if (responses.vsl_pct >= 75) pts += 25;
    
    // Classificação
    let classification = 'frio';
    if (pts >= 100) classification = 'otimo';
    else if (pts >= 60) classification = 'bom';
    
    return { score: pts, classification };
  }
}
```

---

## Redis / Bull Queue

Usado para:
1. Fila de envio de emails (com retry automático)
2. Job agendado: sincronizar métricas do Meta (a cada 1h)
3. Limpeza de leads antigos (a cada 30 dias)

```typescript
@InjectQueue('email')
private emailQueue: Queue;

async triggerEmailSequence(leadId: string, sequenceId: string) {
  await this.emailQueue.add(
    'send-sequence',
    { leadId, sequenceId },
    { delay: 0, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
  );
}
```

---

## Serviços Externos

### uazapi (WhatsApp) — R$ 29/mês

**Caso de Uso:** Enviar mensagens WhatsApp automáticas aos leads (follow-up pós-email)

**Integração:**
```typescript
// leads.service.ts
async sendWhatsAppMessage(lead: Lead, message: string) {
  const response = await fetch('https://free.uazapi.com/send/text', {
    method: 'POST',
    headers: { token: process.env.UAZAPI_TOKEN },
    body: JSON.stringify({
      number: lead.phone,  // formato: 5511999999999
      text: message
    })
  });
  return response.json();
}
```

**Workflow:**
1. Lead preenche form com telefone
2. Sistema envia email (via Resend)
3. Se email não abre em 2 dias → envia WhatsApp (via uazapi)
4. Último toque: "Vimos que não abriu o email. Tá tudo bem, clica aqui no WhatsApp 😊"

**Custo:** R$ 29/mês (fixo, sem limite de mensagens)

---

### RapidAPI (Instagram Analysis) — Pay-as-you-go

**Caso de Uso:** Enriquecer perfil do lead analisando Instagram (stories, reels, engagement, tipo de conteúdo)

**Integração:**
```typescript
// leads-enrichment.service.ts
async enrichLeadFromInstagram(instagramHandle: string) {
  const response = await fetch(
    `https://rapidapi.p.rapidapi.com/instagram-api/analyze`,
    {
      method: 'POST',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'instagram-api.p.rapidapi.com',
      },
      body: JSON.stringify({
        username: instagramHandle,
        analyze: ['stories', 'reels', 'posts', 'engagement', 'audience']
      })
    }
  );
  
  const data = await response.json();
  return {
    followers: data.followers,
    engagement_rate: data.engagement_rate,
    recent_stories: data.stories.slice(0, 3),
    top_reels: data.reels.slice(0, 3),
    content_type: data.primary_content_type,  // lifestyle, fitness, business, etc
    audience_demographics: data.audience  // idade, gênero, localização
  };
}
```

**Workflow:**
1. Lead preenche form (inclui Instagram opcionalmente)
2. Backend busca handle do Instagram
3. RapidAPI analisa: stories, reels, engagement, nicho
4. Sistema enriquece perfil do lead com:
   - Tipo de conteúdo (dá pistas sobre nicho/negócio)
   - Engagement rate (ativo? inativo?)
   - Últimas 3 stories (contexto do que está acontecendo agora)
   - Top 3 reels (qual conteúdo performou melhor)
5. Bonus no score: se content type = "fitness" ou "wellness" → +20pts (alinhado com fisioterapia)

**Exemplo de Enrichment:**
```json
{
  "instagram_handle": "@joao.fisio",
  "followers": 2500,
  "engagement_rate": 4.2,
  "content_type": "fitness",
  "recent_stories": [
    "Story 1: 'Nova turma de pilates começando 💪'",
    "Story 2: 'Dica de alongamento pós-treino'",
    "Story 3: 'Resultado de paciente em 2 meses'"
  ],
  "enrichment_score_bonus": 20,  // conteúdo alinhado
  "lead_quality": "muito_alto"   // combina com scoring original
}
```

**Custo:** ~R$ 0,01-0,10 por análise (depende do plano RapidAPI)
- 100 leads/mês = ~R$ 1-10
- 1000 leads/mês = ~R$ 10-100

---

## Custo Total Mensal (MVP)

| Serviço | Custo | Observação |
|---------|-------|------------|
| Supabase | R$ 0-100 | Gratuito até certo volume |
| Render/Railway | R$ 0-50 | Backend (750h grátis) |
| Vercel | R$ 0 | Frontend |
| Resend | R$ 0-20 | 50k emails/mês grátis |
| uazapi | **R$ 29** | WhatsApp (fixo) |
| RapidAPI | R$ 10-50 | Instagram enrichment (pay-as-you-go) |
| **TOTAL** | **~R$ 50-250/mês** | Escalável |

---

## Próximos Passos (Implementação)

1. ✅ Arquitetura (você está aqui)
2. ⏳ Setup NestJS + Supabase (backend)
3. ⏳ Criar entities (campaigns, forms, leads, events)
4. ⏳ Tracking module (pixel + events)
5. ⏳ Forms module (builder + submit)
6. ⏳ Scoring engine (leads classification)
7. ⏳ Email module (Resend integration)
8. ⏳ WhatsApp module (uazapi integration)
9. ⏳ Enrichment module (RapidAPI Instagram)
10. ⏳ Meta module (OAuth + métricas)
11. ⏳ Analytics module (dashboard stats)
12. ⏳ Setup React + dashboards
13. ⏳ Integração frontend ↔ backend
14. ⏳ Testes E2E
