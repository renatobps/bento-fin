# Bento — Chatbot Financeiro via WhatsApp

> Instrução de projeto para desenvolvimento assistido por IA (Cursor). Leia este documento completo antes de gerar qualquer código. Siga as fases na ordem. Não avance para a fase seguinte sem o fluxo anterior funcionando ponta a ponta.

## 1. Visão do produto

O Bento é um chatbot financeiro que roda dentro do WhatsApp. O usuário registra gastos do dia a dia enviando uma mensagem de texto ou áudio em linguagem natural, sem precisar abrir nenhum app ou fazer login. O bot extrai os dados automaticamente, salva no banco e responde com confirmação. O usuário também pode consultar seus gastos perguntando diretamente no chat. Os dados ficam disponíveis numa dashboard web para visualização, com plano futuro de app mobile.

**Problema que resolve:** controlar gastos exige abrir apps e digitar manualmente, o que gera atrito e faz as pessoas desistirem. O Bento elimina essa fricção usando um canal que a pessoa já usa todos os dias.

**Usuários:** qualquer pessoa física com WhatsApp que queira controlar gastos sem fricção.

**Princípio de design mais importante:** simplicidade radical. O MVP deve fazer bem três coisas — registrar gasto por texto, responder consultas simples, mostrar isso numa dashboard. Áudio, correções, exportação e app mobile vêm depois.

## 2. Integração já existente

Já existe uma instância da Evolution API configurada e funcionando. Use exatamente estas credenciais (estão no `.env`):

```properties
LOJA_WHATSAPP="5561996690313"
WHATSAPP_API_URL=https://wpp.arkcoredev.com
WHATSAPP_API_KEY=B349C56115B1-4F54-924A-A554997E853E
WHATSAPP_INSTANCE_NAME=botml
WHATSAPP_WEBHOOK_URL=https://arkcoredev-webhook.ultrahook.com

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DATABASE_URL=postgresql://user:pass@localhost:5432/bento
```

Não recrie instância nem reconfigure a Evolution API do zero — ela já está rodando. O trabalho é construir o backend que recebe e responde através dela.

## 3. Requisitos

### Funcionais (MVP — prioridade P1)
- Receber mensagem de texto via webhook da Evolution API
- Extrair valor, categoria e descrição do gasto usando IA (Claude API)
- Salvar o gasto no banco vinculado ao número de telefone do usuário (multi-tenant)
- Responder ao usuário confirmando o registro
- Responder consultas em linguagem natural: "gastei hoje", "gastei essa semana", "gastei esse mês"
- Dashboard web simples mostrando lista de gastos e total por categoria

### Funcionais (fase 2 — prioridade P2)
- Suporte a mensagens de áudio (transcrição + mesmo pipeline de extração)
- Fluxo de clarificação quando a mensagem é ambígua (sem valor claro)
- Comando para corrigir ou excluir o último gasto registrado
- Mensagem de onboarding no primeiro contato do usuário

### Funcionais (fase 3 — prioridade P3)
- Exportação de relatório em PDF/CSV
- App mobile (React Native)
- Metas e orçamento mensal

### Não-funcionais
- Resposta do bot em até 5 segundos
- Isolamento de dados rigoroso por usuário (cada query filtrada por `user_id`)
- Conformidade com LGPD (dados financeiros são sensíveis)
- Custo de operação controlado (monitorar uso de tokens de IA por usuário)
- Webhook deve responder 200 imediatamente e processar de forma assíncrona

## 4. Arquitetura

```
WhatsApp (usuário)
      |
      v
[Webhook receiver]  <-- recebe evento messages.upsert da Evolution API
      |
      v
[Audio transcriber] (apenas se for áudio — fase 2)
      |
      v
[LLM parser]  <-- Claude API extrai: intent, valor, categoria, descrição, período
      |
      v
[Backend / regras de negócio]  <-- valida, busca/cria usuário, decide ação
      |
      v
[PostgreSQL]  <----> [Dashboard Next.js]
      |
      v
[Cliente Evolution API]  --> envia resposta de volta ao usuário no WhatsApp
```

**Stack:**
- Backend: Node.js + TypeScript
- Banco: PostgreSQL
- IA de extração: Claude API (modelo `claude-sonnet-4-6`)
- Transcrição de áudio (fase 2): Whisper API (OpenAI) ou similar
- Dashboard: Next.js (React), consumindo a mesma API/banco
- Integração WhatsApp: Evolution API (já configurada)

## 5. Modelo de dados

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(20)
);

INSERT INTO categories (name, icon) VALUES
  ('alimentação', '🍔'), ('transporte', '🚗'), ('lazer', '🎮'),
  ('saúde', '💊'), ('moradia', '🏠'), ('outros', '📦');

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  expense_date DATE NOT NULL,
  source VARCHAR(10) DEFAULT 'text', -- 'text' ou 'audio'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  raw_message TEXT,
  message_type VARCHAR(10),
  processed_successfully BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_state (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  pending_context JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Categorias são fixas no MVP. Não criar categorias dinamicamente via IA — sempre mapear para uma das seis cadastradas, usando "outros" como fallback.

## 6. Casos de uso (com critérios de aceite)

```gherkin
Cenário: Registrar gasto por texto com sucesso
  Dado que o usuário "5511999999999" envia "Bento, gastei 30 reais com um lanche"
  Quando o sistema extrai valor=30, categoria=alimentação, descrição="lanche"
  Então o sistema salva o gasto na base
  E responde "Gasto registrado: R$30,00 - alimentação (lanche)"

Cenário: Consultar gastos do dia
  Dado que o usuário já registrou gastos hoje
  Quando o usuário envia "Bento, quanto gastei hoje?"
  Então o sistema busca todos os gastos da data atual para aquele user_id
  E responde com total e lista detalhada

Cenário: Mensagem ambígua sem valor
  Dado que o usuário envia "Bento, gastei um pouco no mercado"
  Quando o sistema não consegue extrair um valor numérico
  Então o sistema responde pedindo o valor exato
  E aguarda a resposta antes de salvar

Cenário: Mensagem fora de contexto
  Dado que o usuário envia algo não relacionado a gastos (ex: "que dia é hoje?")
  Quando o sistema identifica intent=fora_contexto
  Então o sistema responde educadamente que só entende sobre gastos
  E não tenta salvar nada no banco
```

**Critérios de aceite:**
- Taxa de extração correta de valor e categoria ≥ 90% em mensagens de texto bem formadas
- Tempo de resposta do bot ≤ 5 segundos do recebimento até a confirmação
- Nenhum gasto deve ser salvo com valor incorreto sem confirmação prévia quando a mensagem for ambígua
- Cada usuário só pode ver e consultar os próprios gastos (isolamento por `user_id`)

**Casos de borda a tratar:**
- Valores em formatos variados: "30 reais", "R$30", "30,50", "trinta reais"
- Datas relativas: "ontem", "hoje de manhã", "essa semana"
- Categoria não informada (ex: "gastei 50 reais" sem dizer com o quê) → usar "outros" ou pedir clarificação
- Mensagens simultâneas do mesmo usuário (processar em ordem, não em paralelo, por `user_id`)

## 7. Plano de execução (siga nesta ordem)

### Fase 1 — Setup do projeto
- Inicializar projeto Node.js + TypeScript
- Configurar PostgreSQL (Docker local ou Supabase/Neon para agilizar)
- Rodar o schema SQL da seção 5
- Configurar `.env` com as variáveis da seção 2 (incluindo `ANTHROPIC_API_KEY`)

### Fase 2 — Webhook receiver
- Criar endpoint `POST /webhook` que recebe o payload da Evolution API
- Filtrar pelo evento `messages.upsert`, ignorar mensagens com `key.fromMe = true`
- Extrair telefone (`key.remoteJid`), tipo de mensagem e conteúdo
- Responder `200` imediatamente, processar o resto de forma assíncrona
- Testar com `curl` simulando o payload antes de configurar o webhook real na Evolution API

### Fase 3 — Parser com IA
- Implementar chamada à Claude API com prompt de extração estruturada (retorno em JSON: `intent`, `valor`, `categoria`, `descricao`, `periodo`, `precisa_clarificacao`)
- Validar a categoria retornada contra a lista fixa do banco
- Testar isoladamente com frases de exemplo antes de integrar ao pipeline completo

### Fase 4 — Persistência e resposta
- Buscar ou criar usuário pelo telefone
- Salvar gasto em `expenses`, log da mensagem em `messages_log`
- Implementar lógica de consulta (hoje/semana/mês) com agregação SQL por categoria
- Enviar resposta de volta via Evolution API (endpoint `/message/sendText/{instance}`)
- Validar o fluxo completo ponta a ponta: mensagem real no WhatsApp → resposta real no WhatsApp

### Fase 5 — Dashboard web
- Criar projeto Next.js consumindo a mesma API/banco
- Tela com total do mês, gráfico por categoria, lista de gastos recentes
- Filtros por período
- Autenticação simples por telefone + código OTP enviado via WhatsApp (reaproveitando a Evolution API)

### Fase 6 — Refinamento (pós-MVP)
- Suporte a áudio (download de mídia via Evolution API + transcrição)
- Comando de correção/exclusão do último gasto
- Onboarding automático na primeira mensagem
- Rate limiting no webhook e monitoramento de custo de IA por usuário
- Exportação de relatórios e app mobile

## 8. Instrução para o agente

Ao iniciar o desenvolvimento, comece pela Fase 1. Não pule etapas. Ao terminar cada fase, pare e confirme que ela está funcionando antes de seguir para a próxima — especialmente a Fase 2 (webhook) e a Fase 4 (pipeline completo), que dependem de testes reais contra a Evolution API. Use os nomes de tabelas, colunas e variáveis de ambiente exatamente como definidos neste documento, sem renomear.
