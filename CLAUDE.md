# CLAUDE.md — funnel-platform

## 📋 Visão Geral do Projeto

**funnel-platform** é um SaaS de gerenciamento de funil de vendas com automação completa:

```
Ads (Meta) → VSL (vídeo + pixel) → Formulário → Scoring → Email Automation → Dashboard
```

**Tech Stack:**
- Backend: NestJS 11, TypeORM, PostgreSQL (Supabase)
- Frontend: React 18 + Vite + shadcn/ui + Tailwind
- Integrações: Meta Ads API, Resend (email), uazapi (WhatsApp), RapidAPI (Instagram)

**Infraestrutura (Produção — 2026-05-08):**
- Backend: Railway → `https://zippy-friendship-production-cee4.up.railway.app`
- leadscomia: Vercel → `https://leadscomia.vercel.app`
- Banco: Supabase PostgreSQL (já em nuvem)
- Webhook uazapi: `.../api/webhooks/uazapi` (não `/webhooks/whatsapp`)
- Redis: NÃO implementado — menção no CLAUDE.md era planejamento futuro

---

## 🏗️ Estrutura

```
funnel-platform/
├── ARCHITECTURE.md      # Detalhes completos
├── ROADMAP.md          # Fases MVP → Completo
├── backend/            # NestJS (não incluído ainda)
└── frontend/           # React 18 + Vite
    ├── src/
    │   ├── pages/      # Dashboard, Campaigns, Forms, Leads, Analytics, etc
    │   ├── components/ # Layout, reutilizáveis
    │   ├── App.jsx
    │   └── main.jsx
    ├── public/         # Favicon, ícones
    ├── vite.config.js
    └── tailwind.config.js
```

---

## 🎯 Páginas Implementadas (Frontend)

| Página | Linhas | Status |
|--------|--------|--------|
| Dashboard | 125 | ✅ Estrutura base |
| Forms | 365 | ✅ Form builder UI |
| FormPublic | 274 | ✅ Página pública para leads |
| **Leads** | **480** | **✅ Completa com mensagens + email de leads IG** |
| **InstagramLeads** | **200** | **✅ Análise IA + Card insights** |
| **WhatsAppLeads** | **152** | **✅ Envio de mensagens** |
| **InstagramAutomation** | **490** | **✅ Automação completa comentários → DM → Lead** |
| Campaigns | 22 | ⚠️ Stub |
| EmailSequences | 22 | ⚠️ Stub |
| Analytics | 17 | ⚠️ Stub |
| Settings | 39 | ⚠️ Stub |

---

## 🔧 Ferramentas & Configuração

**Modelo recomendado:** Claude Opus 4.6 ou Sonnet 4.6 (projetos complexos)  
**Para operações git/rápidas:** Claude Haiku 4.5

**Permissões essenciais (em settings.local.json):**
- ✅ `npm create` — scaffolding
- ✅ `npm install` — dependências
- ✅ `npx vite` — dev server
- ✅ `WebFetch(domain:docs.uazapi.com)` — API docs
- ✅ `git add` — staging

---

## 📝 Referências Externas

- [OpenAI GPT-4o-mini](https://openai.com/api/) — ✅ Análise IA de leads + geração de mensagens
- [RapidAPI Instagram Analysis](https://rapidapi.com/) — ✅ 7 arquivos de referência inclusos
- [uazapi](https://docs.uazapi.com) — ✅ WhatsApp automático (R$ 29/mês)
- [Resend Email API](https://resend.com/docs) — documentação necessária
- [Meta Ads API](https://developers.facebook.com/) — ads e pixel tracking
- [Supabase](https://supabase.com/) — PostgreSQL gerenciado

---

## 🚀 Como Começar

### Setup Backend
```bash
cd funnel-platform/backend
npm install
npm start  # NestJS na porta 3001
```

### Setup Frontend
```bash
cd funnel-platform/frontend
npm install
npm run dev  # Vite dev server na porta 5173
```

### Usar o Sistema
1. **Form público:** http://localhost:5173/f/default
   - Preencher: Nome, Email, Telefone, Instagram
   - Lead é criado e enriquecido automaticamente
   - Mensagem é enviada ao WhatsApp em ~10 segundos

2. **Dashboard de Leads:** http://localhost:5173/leads
   - Visualizar todas as mensagens enviadas
   - Ver análise completa da IA
   - Copiar mensagem para reutilizar

3. **Instagram Leads:** http://localhost:5173/instagram
   - Análise completa do Instagram
   - Insights de nicho, engajamento, público
   - Card visual com ângulo de venda

4. **Instagram Automação:** http://localhost:5173/instagram-auto
   - Cria automações: post → palavra-chave → DM automático
   - Fluxo conversacional: confirmação (Sim/Não) + captura de email
   - Leads salvos automaticamente no banco ao capturar email
   - Ver perfis que dispararam cada automação

### Variáveis de Ambiente (`.env`)
```env
OPENAI_API_KEY=sua_chave_aqui
OPENAI_MODEL=gpt-4o-mini
RAPIDAPI_KEY=sua_chave_rapidapi
RAPIDAPI_HOST=instagram120.p.rapidapi.com
UAZAPI_BASE_URL=https://labsai.uazapi.com
UAZAPI_TOKEN=seu_token_uazapi
```

---

## 🎯 Workflow com Claude Code

### Quando pedir algo:
1. Especifique: frontend, backend, ou full-stack
2. Cite a página/módulo exato (ex: "Campaigns.jsx line 12")
3. Se for API: qual endpoint está envolvido?

### O que evitar:
- Não fazer commits sem validação manual
- Não mudar stack (React, Tailwind, Vite) sem avisar
- Não deixar arquivos de teste (TESTE.JS) no stash ou commit

---

## 📚 Documentação Local

- **ARCHITECTURE.md** — 646 linhas, arquitetura completa
- **ROADMAP.md** — 222 linhas, fases MVP → Completo
- **rapidApi/** — 7 arquivos de referência de respostas da API Instagram

---

## ⚡ Status Atual

### Fluxo Implementado (✅ Testado e Funcionando)

**Opção 1: Formulário público**
```
Lead preenche form (/f/default)
  ↓
Instagram enriquecido (RapidAPI)
  ↓
IA analisa: nicho, engajamento, público, oportunidades
  ↓
Mensagem personalizada gerada (OpenAI GPT-4o-mini)
  ↓
Mensagem enviada via WhatsApp (uazapi) em ~10 segundos
  ↓
Dashboard mostra todas as mensagens
```

**Opção 2: Landing Page (leadscomia) + WhatsApp direto**
```
Ad (Meta) → LP (leadscomia) → Dados coletados
  ↓
POST /api/forms/capture (com fbclid + UTMs)
  ↓
Lead salvo + IA enriquece + msg gerada
  ↓
WhatsApp automático disparado em ~10 segundos
  ↓
Dashboard mostra todas as mensagens
```

**Payload esperado em /api/forms/capture:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "instagram": "joaosilva",
  "fbclid": "IwAR...",
  "utmSource": "facebook",
  "utmMedium": "publico-frio",
  "utmCampaign": "janeiro-2025",
  "utmContent": "ad-id-123"
}
```

### Status Geral
**Implementado:**
- ✅ Análise de Instagram com IA (RapidAPI + OpenAI)
- ✅ Envio automático de WhatsApp (uazapi)
- ✅ Dashboard de Leads com mensagens enviadas
- ✅ Card visual com insights da IA
- ✅ Form público + enriquecimento automático
- ✅ Facebook Conversions API — eventos Lead e Purchase (SHA256)
- ✅ Meta Pixel no form — PageView + Lead browser-side
- ✅ Captura de fbclid e UTMs (source, medium, campaign, content) da URL
- ✅ Dashboard com origem do anúncio + botão "Marcar como Convertido"
- ✅ Modal com imagem real do criativo em alta resolução via Marketing API
- ✅ URLs de API via VITE_API_URL (pronto para produção)
- ✅ Instagram Automação de Comentários — comentário → DM automático
- ✅ Fluxo conversacional no DM: confirmação (Quick Replies Sim/Não) → captura de email → salva Lead → envia link
- ✅ Botão clicável no DM (template button com URL)
- ✅ Resposta pública no comentário após disparo
- ✅ Normalização de keywords (maiúsculas, acentos, minúsculas)
- ✅ Edição de automações existentes
- ✅ Modal com perfis que dispararam cada automação (username, email, status da conversa)
- ✅ Leads do Instagram DM aparecem na página /leads com email visível
- ✅ Paginação na página /leads (6 leads por página, botões anterior/próximo/números)
- ✅ Filtros por origem na página /leads: Todos / Instagram DM / Tráfego Pago
- ✅ Integração leadscomia → /api/forms/capture com fbclid + UTMs capturados da URL
- ✅ **Efraim: Agente conversacional WhatsApp completo** (GPT-5.4-mini, 7 stages, debounce 10s)
  - Webhook `/api/webhooks/whatsapp` recebe mensagens do uazapi
  - Stages: abertura → escuta → rapport → video → fechamento → confirmado/perdido → encerrado
  - Confirmado: responde até 3x pós-agendamento, depois encerra
  - Perdido: tenta 2x re-engajar, depois encerra
  - Prompt: sem "cara", validações variadas, foco em funil+IA
  - Deduplicação de mensagens (Set com timeout 5min)
  - Debounce 10s: acumula múltiplas msgs, processa 1x
  - Normalização de phone com/sem DDI 55
  - Typing indicator antes de responder
- ✅ **Follow-up com Stories + Visão Computacional** (2026-05-02)
  - Endpoints: `POST /leads/:id/followup` (gera mensagem) + `POST /leads/:id/send-followup` (envia)
  - Busca stories via RapidAPI `/api/instagram/stories` (máx 5 stories)
  - Backend baixa cada imagem com headers de browser e converte para base64
  - GPT-4o Vision analisa cada imagem (foto ou thumbnail de vídeo) em paralelo
  - Gera mensagem de follow-up citando conteúdo visual específico do story
  - Se conta privada ou sem stories: usa dados existentes do lead (nicho, ângulo de venda)
  - Frontend: card "Follow-up com Stories" na página /leads com textarea editável + botão enviar
  - **RapidAPI fallback**: `/profile` → se 500 → tenta `/userInfo` automaticamente (backend e leadscomia)
  - leadscomia: `instagramApi.ts` também tem o mesmo fallback para o form da LP
- ✅ **Deploy em produção (2026-05-08)**
  - Backend no Railway (NestJS, porta dinâmica via `process.env.PORT`)
  - leadscomia no Vercel
  - Endpoint proxy `POST /api/instagram/profile` — leadscomia chama backend em vez de RapidAPI diretamente (evita CORS)
  - Fix phone: Efraim normaliza 6 variantes (com/sem DDI 55, com/sem 9 extra) — `efraim.controller.ts`
  - Faturamento (`revenueRange`) exibido na seção "Sobre o Lead" na página `/leads` com badge colorido
  - Modal animada de análise no leadscomia com 4 etapas progressivas (`LeadForm.tsx`)
  - Bullet "armadilha da indicação" adicionado na seção "O que você vai descobrir" em `Result.tsx`
- ✅ **Facebook CAPI: Qualidade do evento aprimorada** (2026-04-24)
  - Novos parâmetros: fbp (cookie _fbp), external_id (lead UUID), client_ip_address, client_user_agent
  - Nota esperada: 6.9/10 → 8-9/10
  - leadscomia captura fbp do Meta Pixel cookie
  - Backend extrai clientIp de X-Forwarded-For header
  - Todos os parâmetros com hash adequado (fbc, em, ph, fn)

### Integrações Instagram (app CRM-CLAUDE-IG)
- **Token:** IGAAX — usa `graph.instagram.com` (NÃO `graph.facebook.com`)
- **IG_USER_ID:** 26565250533125084
- **IG_WEBHOOK_VERIFY_TOKEN:** funnel-platform-ig-2026
- **Webhook campos ativos:** `comments` + `messages`
- **App modo:** Ao vivo (Live) — funciona para qualquer usuário
- **Tabelas criadas:** `ig_automations`, `ig_conversations`
- **Fluxo de steps em ig_conversations:** `waiting_confirmation` → `waiting_email` → `completed`

### Integrações Facebook
- **FB_PIXEL_ID** — Pixel do Meta Ads (964343959626807)
- **FB_ACCESS_TOKEN** — Token do Conversions API (curta duração, específico para envio de eventos)
- **FB_ADS_TOKEN** — Token do app CRM-IA com ads_read, ads_management, business_management (✅ renovado 60 dias em 2026-04-21)
- **FB_AD_ACCOUNT_ID** — act_690814526400981 (conta "Lançamento")

### 🏷️ Identificação de Origem dos Leads

Os leads são classificados por origem com base nos campos `utmSource`, `utmMedium` e `fbclid` salvos no banco.

| Origem | Critério | Como é setado |
|---|---|---|
| **Instagram DM** | `utmSource = 'instagram'` AND `utmMedium = 'dm-automation'` | Automático pelo `instagram-automation.service.ts` ao salvar lead via DM |
| **Tráfego Pago** | `fbclid IS NOT NULL` OR `utmSource IN ('facebook', 'leadscomia')` | Capturado da URL quando lead vem de anúncio Meta Ads |
| **Sem origem** | Nenhum dos campos acima | Lead veio de form direto sem rastreamento |

**Filtros disponíveis na página `/leads`:**
- **Todos** — sem filtro
- **Instagram DM** — leads captados pela automação de comentários → DM
- **Tráfego Pago** — leads com fbclid (clicaram em anúncio) ou utmSource facebook/leadscomia

**Fluxo de cada origem:**
```
Instagram DM:
  Comentou no post → automação dispara → DM conversacional → captura email
  → salva Lead com utmSource='instagram', utmMedium='dm-automation'

Tráfego Pago:
  Ad Meta → LP (leadscomia) com ?fbclid=...&utm_source=facebook
  → lead preenche modal → POST /api/forms/capture
  → salva Lead com fbclid + UTMs da URL
```

---

## 🗺️ Planejamento — Próximas Features

### 1. Painel do Closer (IA Auxiliar)

**Objetivo:** O closer entra na reunião com brief completo do lead + pode consultar a IA durante a call.

**Fluxo:**
```
Efraim coleta dados do lead (estágios WhatsApp)
  → Painel gera brief automático antes da reunião
  → Durante a reunião: closer digita situação/dúvida → IA responde com sugestão
```

**O painel tem duas partes:**
- **Brief do lead** (gerado antes da reunião):
  - Perfil resumido: dor principal, contexto, o que respondeu pro Efraim
  - Pontos quentes pra explorar
  - Possíveis objeções mapeadas
  - Perguntas sugeridas pra abertura

- **Chat com IA Closer** (durante a reunião):
  - Closer digita situação rápida → IA sugere como conduzir
  - Histórico do lead já carregado no contexto da IA

**Identificação dos leads:** número de WhatsApp (já resolvido). Leads do form e da leadscomia cruzam pelo telefone.

**O que construir:**
- [ ] Endpoint que pega dados do lead e gera o brief via IA
- [ ] Interface do painel (uma página por lead, simples)
- [ ] Chat contextualizado com histórico do lead já carregado

---

### 2. Criação de Carrossel para Instagram

**Objetivo:** Gerar carrosséis completos (texto + imagem) no template definido e postar automaticamente no Instagram.

**Fluxo:**
```
Usuário dá inputs (tema, nº slides, tom de voz, conta IG destino)
  → IA gera copy de todos os slides de uma vez
  → Usuário revisa e ajusta os textos no painel
  → Botão "Gerar imagem" por slide (ou "Gerar todas")
    → IA lê o texto do slide e cria o prompt da imagem automaticamente
    → Imagem aparece no painel para revisão
  → Usuário aprova
  → Sistema monta no template do Canva (via MCP)
  → Publica no Instagram via Graph API
```

**Template (design já definido pelo usuário):**
- Header fixo: foto de perfil circular + nome + @instagram
- Corpo: texto/copy do slide (variável por slide)
- Imagem gerada por IA na parte inferior (contexto = texto do slide)
- Estilo: limpo, fundo claro

**Módulos a construir:**
- [ ] Input no CRM (tema, nº slides, tom, conta IG)
- [ ] Geração de copy via LLM (todos os slides de uma vez)
- [ ] Painel de revisão de texto por slide
- [ ] Geração de imagem por slide via DALL-E/Ideogram (botão por slide + "gerar todas")
- [ ] Montagem no Canva via MCP (template com áreas de texto e imagem mapeadas)
- [ ] Publicação via Instagram Graph API (já integrada)

**Pontos pendentes antes de implementar:**
- Escolha do gerador de imagem (DALL-E 4, Ideogram, ou outro)
- Template no Canva criado manualmente uma vez com áreas variáveis mapeadas
- Quantidade média de slides por carrossel a definir

---

---

## 🎨 Feature: Geração de Carrossel para Instagram ✅ IMPLEMENTADO (2026-04-28)

### Fluxo
```
Usuário dá inputs (tema, nº slides, tom de voz)
  → IA gera copy de todos os slides (OpenAI gpt-4o-mini / gpt-5.4-mini)
  → Usuário revisa e edita textos no painel
  → Botão "Gerar imagem" por slide → IA gera prompt + DALL-E 2/3 → Supabase Storage
  → Puppeteer renderiza template HTML → PNG 1080×1350 (4:5 Instagram) → Supabase
  → Botão "Publicar" (mínimo 2 slides com imagem) → Instagram Graph API carousel
```

### Backend — módulo `carousel`
```
backend/src/carousel/
├── carousel.entity.ts      — tabela 'carousels', slides em JSONB
├── carousel.service.ts     — toda a lógica (copy, imagem, template, publicação)
├── carousel.controller.ts  — 8 endpoints REST
└── carousel.module.ts
```

**Endpoints:**
- `POST /carousel` — cria + gera copy
- `GET /carousel` — lista
- `GET /carousel/:id` — detalhe
- `PATCH /carousel/:id` — atualiza slides
- `POST /carousel/:id/generate-image/:index` — gera imagem de 1 slide
- `POST /carousel/:id/generate-images` — gera todas
- `POST /carousel/:id/publish` — publica no Instagram
- `DELETE /carousel/:id`

**Variáveis de ambiente:**
```env
SUPABASE_URL=https://vqtpzneufahhrzjklyvn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=Crm-carrossel   # bucket público no Supabase Storage
IG_PROFILE_NAME=Fagner Batista
IG_PROFILE_HANDLE=fagnerbatista
IG_PROFILE_AVATAR_URL=                  # ⚠️ URL do CDN do IG expira — fazer upload no Supabase
```

**Dependências adicionadas:** `puppeteer`, `@supabase/supabase-js`

**Template Puppeteer (4:5 = 1080×1350px):**
- Header: foto de perfil + nome + @handle
- Texto: font 46px, line-height 2.0, ocupa espaço principal
- Imagem IA: 380px fixo na parte inferior, border-radius 24px

**Modelos de IA:**
- Copy dos slides: `/* 'gpt-5.4-mini' */ 'gpt-4o-mini'` (comentado para teste — descomente em prod)
- Prompt de imagem: mesmo modelo acima
- Geração de imagem: `dall-e-2` (512×512, para teste) — trocar para `dall-e-3` + `1024×1792` em prod

**⚠️ Pendência: Refinamento do prompt de copy**
O método `generateCopy()` em `carousel.service.ts` ~L88 usa prompt genérico.
Precisa ser refinado com: tom de voz do Fagner, estilo de escrita, regras específicas.
Referência de estilo: Frank Costa — frases curtas, muito espaçadas, uma ideia por linha.

### Frontend — `Content.jsx`
- Rota: `/content` → sidebar grupo "Conteúdo"
- 3 estados: formulário → revisão de slides → publicado
- Preview modal com navegação por setas (proporção 4:5 fiel ao Instagram)
- Botão publicar aparece sempre; desabilitado com aviso até ter ≥ 2 imagens geradas
- Edições de texto salvas automaticamente no onBlur

---

### 3. Agente Pós-Imersão (segundo agente WhatsApp)

**Problema:** O Efraim atual só cobre o funil de primeira abordagem. Se o lead responder ao follow-up de stories, cai no Efraim com o prompt errado.

**Objetivo:** Criar um segundo agente com prompt e objetivo diferentes — contexto de pós-evento/imersão (reativar, coletar feedback, aquecer para próxima oferta).

**O que construir:**
- [ ] Definir objetivo do agente pós-imersão (reengajamento, feedback, nova oferta?) — **a definir com Fagner**
- [ ] Novo prompt com contexto de pós-imersão
- [ ] Campo `agentMode` no lead ou uso do `waStage` para identificar qual agente responde
- [ ] Roteamento no webhook (`/api/webhooks/whatsapp`): se lead veio do follow-up → agente B, senão → Efraim padrão

**Roteamento sugerido:**
```
Webhook recebe mensagem do lead
  ↓
Verifica agentMode do lead (ou waStage)
  ↓
agentMode = 'efraim'      → prompt funil primeira abordagem
agentMode = 'pos-imersao' → prompt pós-evento
agentMode = null          → Efraim padrão
```

---

### ⚠️ Pendências
- [x] **Renovar FB_ADS_TOKEN para token de longa duração (60 dias)** — ✅ CONCLUÍDO em 2026-04-21
- [x] **Renovar IG_TOKEN (IGAAX) para 60 dias** — ✅ CONCLUÍDO em 2026-04-20
- [x] **Implementar Efraim (agente WhatsApp)** — ✅ CONCLUÍDO em 2026-04-24
- [x] **Melhorar qualidade evento Facebook** — ✅ CONCLUÍDO em 2026-04-24 (6.9 → 8-9/10)
- [ ] **Renovar token uazapi** — temporário (1h), precisa gerar novo quando expirar
- [ ] **Otimizar prompt do follow-up de vídeo (Efraim)** — método `generateVideoFollowup()` em `efraim.service.ts`; ajustar tom, exemplo de nicho e CTA de confirmação para o evento
- [ ] **Integração Kiwify webhook** — POST /api/checkout/webhook pra marcar convertido via checkout
- [ ] **Kanban board visual** — opcional, usa waStage para mostrar progresso dos leads
- [ ] **Agente Pós-Imersão** — segundo agente WhatsApp com prompt de reengajamento; quando lead responde follow-up de stories, roteamento por `agentMode` no lead
- [ ] **Reduzir imagem Docker** — trocar `puppeteer` por `puppeteer-core` + `@sparticuz/chromium` (~50MB vs 577MB atual)
- [x] **Copy da landing page leadscomia (página inicial)** — ✅ CONCLUÍDO em 2026-04-26
  - `HeroContent.tsx`: título, subtítulo (em negrito) e bullets atualizados
  - `LeadForm.tsx`: título do box, subtítulo, botão e rodapé atualizados
- [ ] **Outras redesigns de layout** — user mencionou depois
- [x] **Meta Pixel no leadscomia** — ✅ CONCLUÍDO em 2026-05-02
  - Script instalado no `index.html` (ID: 964343959626807 — mesmo do funnel-platform)
  - `PageView` — dispara ao entrar na home
  - `ViewContent` — dispara ao chegar na página `/resultado`
  - `Lead` — dispara após preencher nome + WhatsApp e enviar o form (só no sucesso)
  - Visível no Gerenciador de Eventos do Meta com taxa de conversão por etapa
- [x] **leadscomia — melhorias de UX e copy (2026-05-02)**
  - Modal de confirmação ao avançar sem Instagram (design glass-card da página)
  - Bullets do fallback (sem Instagram) atualizados com dores reais do funil
  - CTA dos dois botões da página de resultado: "Quero ver ao vivo!"
  - Headline da home atualizada
  - Estatística social proof atualizada (83% vs 66%)
  - Espaçamentos das seções ajustados
  - Fix email vazio → `null` no backend (evitava erro unique constraint)

### 📊 Analytics — Decisão (2026-05-02)
- **Meta Pixel** instalado — suficiente para analisar funil de tráfego pago
- **Google Analytics 4** — avaliado, decidido não instalar por enquanto
  - Seria útil para visão de tráfego orgânico/direto independente do Meta
  - Para adicionar: criar propriedade GA4, pegar ID `G-XXXXXXXXXX`, instalar no `index.html` e `Result.tsx`
  - O Meta Ads Manager já resolve o necessário para a fase atual

---

**Última atualização:** 2026-05-08 (Deploy produção Railway + Vercel ✅ | Proxy Instagram ✅ | Fix phone 9 extra ✅ | Modal animada leadscomia ✅ | Faturamento no board ✅)
