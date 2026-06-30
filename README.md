# Bento — Chatbot Financeiro via WhatsApp

Backend Node.js + TypeScript para registrar e consultar gastos via WhatsApp (Evolution API) com extração por IA (Claude).

## Pré-requisitos

- Node.js 20+
- Docker Desktop (PostgreSQL local) **ou** banco PostgreSQL remoto (Neon/Supabase)
- `ANTHROPIC_API_KEY` configurada no `.env`

## Setup

```powershell
# 1. Instalar dependências
npm install

# 2. Subir PostgreSQL (Docker Desktop deve estar rodando)
docker compose up -d

# 3. Aplicar schema
npm run db:migrate

# 4. Configurar .env (copie de .env.example e preencha ANTHROPIC_API_KEY)

# 5. Iniciar servidor
npm run dev
```

O servidor sobe em `http://localhost:3000`.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check + conexão com banco |
| POST | `/webhook` | Recebe eventos da Evolution API |

## Testar webhook localmente

Simule um evento `messages.upsert`:

```powershell
curl -X POST http://localhost:3000/webhook `
  -H "Content-Type: application/json" `
  -d '{
    "event": "messages.upsert",
    "instance": "botml",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST123"
      },
      "pushName": "Teste",
      "message": {
        "conversation": "Bento, gastei 30 reais com um lanche"
      },
      "messageType": "conversation"
    }
  }'
```

> Resposta imediata: `200 {"received":true}`. O processamento é assíncrono.

## Configurar webhook na Evolution API

Aponte o webhook da instância `botml` para a URL pública do backend (ex.: ultrahook ou deploy). Use a variável `WHATSAPP_WEBHOOK_URL` como referência.

## Estrutura

```
src/
  config/       # Variáveis de ambiente
  db/           # Pool PostgreSQL e migrations
  repositories/ # Acesso a dados
  routes/       # Express routes
  services/     # LLM, WhatsApp, processamento
  types/        # Tipos TypeScript
  utils/        # Formatação
sql/
  schema.sql    # Schema do banco
```

## Fases do projeto

- [x] Fase 1 — Setup (Node, TypeScript, PostgreSQL, schema)
- [x] Fase 2 — Webhook receiver
- [x] Fase 3 — Parser com Claude API
- [x] Fase 4 — Persistência e resposta WhatsApp
- [ ] Fase 5 — Dashboard Next.js
- [ ] Fase 6 — Refinamentos (áudio, correção, onboarding)

Consulte `BENTO_SPEC.md` para especificação completa.
