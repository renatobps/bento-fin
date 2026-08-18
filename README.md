# Bento — Chatbot Financeiro via WhatsApp

Backend Node.js + TypeScript para registrar e consultar gastos via WhatsApp (Evolution GO) com extração por IA (Claude). Dashboard web em Next.js para visualização.

## Pré-requisitos

- Node.js 20+
- Docker Desktop (PostgreSQL local) **ou** banco PostgreSQL remoto (Neon/Supabase)
- `ANTHROPIC_API_KEY` configurada no `.env`

## Setup

```powershell
# 1. Instalar dependências do backend
npm install

# 2. Subir PostgreSQL (Docker Desktop deve estar rodando)
docker compose up -d

# 3. Aplicar schema
npm run db:migrate

# 4. Configurar .env (copie de .env.example e preencha as chaves)

# 5. Iniciar backend
npm run dev

# 6. Dashboard (outro terminal)
cd dashboard
npm install
copy .env.local.example .env.local
npm run dev
```

| Serviço | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| Dashboard | http://localhost:3001 |
| Webhook | POST http://localhost:3000/webhook |

## Endpoints da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | — | Health check |
| POST | `/webhook` | apikey | Eventos do Evolution GO |
| POST | `/api/auth/request-otp` | — | Envia OTP via WhatsApp |
| POST | `/api/auth/verify-otp` | — | Valida OTP, retorna JWT |
| GET | `/api/expenses?period=` | JWT | Lista de gastos |
| GET | `/api/expenses/summary?period=` | JWT | Totais por categoria |

Períodos: `hoje`, `semana`, `mes`

## Dashboard

1. Acesse http://localhost:3001
2. Informe seu número de WhatsApp (com DDI)
3. Receba o código OTP no WhatsApp
4. Visualize total, gráfico por categoria e lista de gastos

## Conectar a instância do Evolution GO

O webhook é registrado no `connect` da instância. O Evolution GO **não envia o header `apikey`**, então
inclua o token como query string para o Bento aceitar o evento:

```powershell
Invoke-RestMethod -Method POST -Uri "$env:WHATSAPP_API_URL/instance/connect" -Headers @{ apikey = $env:WHATSAPP_API_KEY } -ContentType "application/json" -Body '{"webhookUrl":"https://seu-tunel.ultrahook.com?apikey=SEU_TOKEN","subscribe":["MESSAGE"]}'
```

## Testar webhook localmente

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/webhook?apikey=SEU_TOKEN" -ContentType "application/json" -Body '{"event":"MESSAGE","instance":"botml","data":{"key":{"remoteJid":"5511999999999@s.whatsapp.net","fromMe":false,"id":"TEST123"},"pushName":"Teste","message":{"conversation":"Bento, gastei 30 reais com um lanche"}}}'
```

## Estrutura

```
src/              # Backend Express
dashboard/        # Frontend Next.js
sql/schema.sql    # Schema PostgreSQL
```

## Comandos no WhatsApp (Fase 6)

| Exemplo | Ação |
|---------|------|
| Áudio: "gastei 30 reais com lanche" | Transcreve (Whisper) e registra |
| "apaga o último gasto" | Exclui o gasto mais recente |
| "corrige o último para 50 reais" | Atualiza valor/categoria/descrição |

> Áudio requer `OPENAI_API_KEY` configurada no `.env`.

## Fases do projeto

- [x] Fase 1 — Setup (Node, TypeScript, PostgreSQL, schema)
- [x] Fase 2 — Webhook receiver
- [x] Fase 3 — Parser com Claude API
- [x] Fase 4 — Persistência e resposta WhatsApp
- [x] Fase 5 — Dashboard Next.js + OTP
- [x] Fase 6 (parcial) — Áudio, correção/exclusão do último gasto
- [ ] Fase 6 — Onboarding, rate limiting, exportação, app mobile

Consulte `BENTO_SPEC.md` para especificação completa.
