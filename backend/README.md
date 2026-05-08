# Funnel Platform - Backend

NestJS backend com integração WhatsApp (uazapi) + Instagram enrichment (RapidAPI).

## Quickstart

```bash
npm install
cp .env.example .env  # Configure variáveis
npm run start:dev
```

## Estrutura

- **leads/**: CRUD de leads
- **enrichment/**: Integração RapidAPI Instagram
- **messaging/**: Envio WhatsApp via uazapi
- **forms/**: Submit de formulários + scoring

## Endpoints

```
GET  /api/leads                    # Listar leads
GET  /api/leads/:id               # Detalhe do lead
POST /api/leads/:id/enrich        # Enriquecer via Instagram
POST /api/leads/:id/message       # Enviar WhatsApp
POST /api/leads/bulk-message      # Envio em massa
POST /api/forms/:id/submit        # Submit formulário
```
