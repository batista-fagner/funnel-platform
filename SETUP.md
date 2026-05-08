# 🚀 Setup — funnel-platform

## Estrutura do Projeto

```
funnel-platform/
├── frontend/      React 18 + Vite (PORT 5174)
├── backend/       NestJS 11 (PORT 3001)
├── ARCHITECTURE.md
├── ROADMAP.md
└── SETUP.md       ← você está aqui
```

---

## ✅ Pré-requisitos

- Node.js 18+
- PostgreSQL (Supabase recomendado)
- Contas ativas em:
  - **uazapi** (WhatsApp) — R$ 29/mês
  - **RapidAPI** (Instagram) — pay-as-you-go

---

## 🔧 Setup Local

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env

# Editar .env com suas credenciais:
# SUPABASE_DATABASE_URL=
# UAZAPI_TOKEN=
# RAPIDAPI_KEY=
```

**Iniciar:**
```bash
npm run start:dev  # Escuta em http://localhost:3001/api
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env  # opcional — usa localhost:3001 por padrão

npm run dev  # Escuta em http://localhost:5174
```

---

## 📝 Fluxo de Uso

1. **Form Submit** (`/f/:formId`)
   - Usuário preenche: nome, telefone, **instagram**
   - Backend calcula score + dispara enrichment assíncrono

2. **Enriquecimento** (`/whatsapp` → Enriquecer)
   - Busca dados do Instagram via RapidAPI
   - Calcula bônus (+20pts se fitness/wellness)
   - Mostra: followers, engagement, content_type

3. **WhatsApp** (`/whatsapp` → Enviar)
   - Escreve mensagem com `{nome}`, `{instagram}`
   - Envia via uazapi
   - Marca lead como "contatado"

---

## 📊 Endpoints Implementados

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/leads` | Listar todos os leads |
| `GET` | `/leads/:id` | Detalhe do lead |
| `POST` | `/leads/:id/enrich` | Enriquecer via Instagram |
| `POST` | `/leads/:id/message` | Enviar WhatsApp |
| `POST` | `/leads/bulk-message` | Envio em massa |
| `POST` | `/forms/:id/submit` | Submit formulário |

---

## 🐛 Troubleshooting

**"Cannot connect to database"**
- Verificar `SUPABASE_DATABASE_URL` no `.env`
- Confirmar que Supabase está acessível

**"RapidAPI error"**
- Validar chaves em https://rapidapi.com/
- Criar nova subscription se limite atingido

**"uazapi token invalid"**
- Gerar novo token em https://painel.uazapi.com

---

## 🚢 Deploy

Backend (Vercel/Railway):
```bash
npm run build
npm run start:prod
```

Frontend (Vercel):
```bash
npm run build
# Enviar pasta dist/
```

---

**Última atualização:** 2026-04-16
