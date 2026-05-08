# Roadmap — funnel-platform

## MVP (4-5 semanas) vs Sistema Completo

---

## MVP — Escopo

### Incluído no MVP ✅

**Backend:**
- ✅ Auth (login JWT simples)
- ✅ CRUD Campanhas (criar, listar, editar)
- ✅ Pixel de rastreamento (/tracking/event)
- ✅ Formulário qualificador (formulário padrão, sem builder)
- ✅ Scoring automático (lógica simples)
- ✅ Lead capture + classificação (Ótimo/Bom/Frio)
- ✅ Email automation básica com Resend (3 emails fixos)
- ✅ Meta Ads integration (apenas LEITURA de métricas)

**Frontend:**
- ✅ Dashboard básico (funil visual, números principais)
- ✅ Lista de campanhas
- ✅ Criação de campanha (nome, budget, objetivo)
- ✅ Página de forma (não customizável — padrão)
- ✅ Lista de leads com score/classificação
- ✅ Detalhes do lead (events, emails enviados)
- ✅ Configuração básica (Resend API key, Meta token)

**Database:**
- ✅ campaigns, vsl_pages, forms (1 padrão), leads, events, email_sequences, email_logs

**Pixel:**
- ✅ Detecta: page_load, vsl_25/50/75/100, cta_click, form_open
- ✅ Correlação anônima (session_id → email ao submeter form)

**Email:**
- ✅ Sequência fixa (welcome, doubt, last_chance)
- ✅ Dispatch via Resend
- ✅ Tracking basic (sent_at, opened_at, clicked_at via webhooks do Resend)

**Métricas:**
- ✅ Funil visual: (impressões → cliques → VSL → form → leads)
- ✅ Por campanha: leads ótimo/bom/frio, custo por lead
- ✅ Meta API: CPM, CPC, CTR, spend, reach (sincronizado a cada carregamento)

---

### Fora do MVP ❌

- ❌ Form Builder visual (drag & drop)
- ❌ Criação de campanhas via Meta API (apenas leitura)
- ❌ Ad Builder (geração de variações)
- ❌ A/B testing de criativos
- ❌ VSL hosting (usa URL externa)
- ❌ Analytics avançados (ROI, LTV, cohort)
- ❌ Multi-usuário / permissões
- ❌ White label
- ❌ Integrações (Zapier, Make, etc)
- ❌ Webhooks customizados

---

## Timeline MVP

| Semana | Tarefas | Status |
|--------|---------|--------|
| **1** | Setup NestJS, Supabase, entities | ⏳ |
| **1-2** | Tracking module (pixel + events) | ⏳ |
| **2** | Forms module (submit, scoring) | ⏳ |
| **2-3** | Email module (Resend + Bull Queue) | ⏳ |
| **3** | Meta module (OAuth, métricas leitura) | ⏳ |
| **3-4** | React setup + Dashboard | ⏳ |
| **4** | Frontend: Campaigns, Leads pages | ⏳ |
| **4-5** | Integração frontend ↔ backend | ⏳ |
| **5** | Testes, deploy | ⏳ |

**Estimativa total:** 4-5 semanas (com 40h/semana)

---

## Sistema Completo — Adições Futuras

### Fase 1 (Pós-MVP) — 2-3 semanas

- ✅ Form Builder visual (drag & drop)
- ✅ Criação de campanhas via Meta API (POST)
- ✅ Ad Builder: upload template + editor de fields
- ✅ Geração automática de variações (A/B)

### Fase 2 — 2 semanas

- ✅ Analytics avançados (ROI, LTV, CPC por conversão)
- ✅ Relatórios exportáveis (PDF, CSV)
- ✅ Segmentação de leads (filtros avançados)
- ✅ Automação avançada (conditional emails, smart sequencing)

### Fase 3 — 2-3 semanas

- ✅ VSL hosting próprio
- ✅ Multi-usuário + permissões
- ✅ White label (domínio customizado, branding)
- ✅ Webhooks de saída (Zapier, Make integration)
- ✅ API pública (para clientes criar campanhas via API)

### Fase 4 — Ongoing

- ✅ Google Ads integration
- ✅ Integração com CRM (Pipedrive, Keap)
- ✅ SMS automation
- ✅ Whatsapp integration
- ✅ AI-powered copywriting (gerar headlines, bodies)

---

## Definição de "Pronto" — MVP

**Backend:**
- [ ] Todas as APIs implementadas
- [ ] Pixel funciona e correlaciona eventos
- [ ] Scoring calcula corretamente
- [ ] Emails disparam automaticamente
- [ ] Meta API sincroniza métricas
- [ ] Testes unitários dos serviços críticos

**Frontend:**
- [ ] Dashboard mostra métricas corretas
- [ ] Campanhas CRUD funciona
- [ ] Leads aparecem com score/classificação
- [ ] Email logs mostram status (sent/opened/clicked)
- [ ] Responsive (mobile, tablet, desktop)

**End-to-End:**
- [ ] Lead clica em anúncio → VSL → form → email dispara
- [ ] Métricas aparecem no dashboard em <5s
- [ ] Sem erros no console (frontend e backend)

---

## Deployment MVP

**Backend:**
- Deploy no Railway, Render ou Heroku (Node.js + Supabase)
- Variáveis de env: Supabase, Resend API key, Meta token, **uazapi token, RapidAPI key**

**Frontend:**
- Deploy no Vercel (otimizado para Next.js, mas funciona com React + Vite)
- Variáveis de env: API URL (backend)

**Database:**
- PostgreSQL no Supabase (gratuito até certo volume)

**Estimativa de custo (MVP):**
- Supabase: R$ 0-100/mês
- Render/Railway (backend): R$ 0-50/mês (primeiros 750h/mês grátis)
- Vercel (frontend): R$ 0/mês
- Resend: R$ 0 (50k emails/mês no plano grátis, depois R$ 20/mês)
- **uazapi (WhatsApp):** R$ 29/mês (fixo)
- **RapidAPI (Instagram):** R$ 10-50/mês (pay-as-you-go, ~100 análises)
- **Total: ~R$ 50-200/mês**

---

## Integração de Serviços no MVP

### uazapi (WhatsApp Follow-up)
**Incluído no MVP?** ✅ **SIM (opcional, fase 2)**

Implementação:
1. Após form_submit: envia email imediato
2. Se email não abrir em 2 dias: envia WhatsApp automático
3. Última oportunidade: "Vi que não abriu. Tá tudo bem, clica aqui 😊"

Benefício: 2-3x mais cliques que só email

### RapidAPI (Instagram Enrichment)
**Incluído no MVP?** ⚠️ **NÃO (Fase 1, pós-MVP)**

Por que depois:
- Maior complexidade (análise de perfil)
- MVP pode rodar sem isso
- Lead scoring funciona só com form responses

Fase 1 (semana 6-7 pós-MVP):
- Adicionar campo "Instagram" ao formulário (opcional)
- Backend dispara análise do RapidAPI (async)
- Enriquece lead com insights
- Bonus score se alinhado (fitness/wellness → +20pts)
- Dashboard mostra "Insight: @joao.fisio tem 2.5k seguidores, 4.2% engagement"

---

## Sucesso Pós-MVP

Depois de lançar o MVP, métricas de sucesso:
1. **Usabilidade:** Lead consegue criar campanha em <5 minutos
2. **Retenção:** 80% dos leads registrados preenchem o formulário
3. **Performance:** Dashboard carrega em <2s
4. **Confiabilidade:** 99.9% uptime
5. **Conversão:** 10-15% dos leads "Ótimo" viram clientes pagos

---

## Feedback Loop MVP → Completo

Durante o MVP:
- Coletar feedback dos primeiros 10 clientes
- Identificar feature mais pedida (Form Builder? Ad Builder?)
- Priorizar Fase 1 conforme demanda real
- Não adicionar features sem validação do mercado

---

## Nota Importante

**MVP não é MVP se não funcionar.** Foco em:
- ✅ Tracking 100% confiável
- ✅ Scoring correto
- ✅ Emails despachados
- ✅ Dashboard útil

Tudo o mais é nice-to-have.
