import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import type { IntentSource, ParsedMessage } from "../types/parsed-message.js";
import { hasFinancialContext, isFinancialIntent } from "../utils/financial-keywords.js";
import { getTodayISO } from "../utils/format.js";
import { enrichParsedFromText } from "../utils/amount-parser.js";
import { prefilterIntent } from "./intent-prefilter.js";
import { withRetry } from "../utils/retry.js";

const CONFIDENCE_THRESHOLD = 0.7;

const SYSTEM_PROMPT = `Você é o parser do Bento, um assistente financeiro via WhatsApp.
Analise a mensagem do usuário e retorne APENAS um JSON válido (sem markdown) com os campos:

{
  "intent": "registrar_gasto" | "registrar_receita" | "pagar_fatura" | "consultar_gastos" | "consultar_saldo" | "consultar_credito" | "consultar_limites" | "atualizar_limite_cartao" | "excluir_ultimo_gasto" | "corrigir_ultimo_gasto" | "cumprimento" | "fora_contexto" | "clarificacao_resposta",
  "valor": number | null,
  "categoria": "alimentação" | "transporte" | "lazer" | "saúde" | "moradia" | "outros" | null,
  "descricao": string | null,
  "periodo": "hoje" | "semana" | "mes" | null,
  "precisa_clarificacao": boolean,
  "expense_date": "YYYY-MM-DD" | null,
  "confianca": number,
  "gastos": [{"valor": number, "categoria": "alimentação" | "transporte" | "lazer" | "saúde" | "moradia" | "outros" | null, "descricao": string | null, "expense_date": "YYYY-MM-DD" | null}] | null,
  "receitas": [{"valor": number, "income_category": "salário" | "freelance" | "venda" | "investimento" | "presente" | "outros" | null, "descricao": string | null, "expense_date": "YYYY-MM-DD" | null}] | null,
  "payment_method": "dinheiro" | "pix" | "debito" | "credito" | null,
  "card_name": string | null,
  "income_category": "salário" | "freelance" | "venda" | "investimento" | "presente" | "outros" | null
}

REGRA DE OURO: se a mensagem NÃO mencionar gasto, receita, dinheiro, saldo, crédito, fatura, limite, orçamento, "quanto gastei/posso gastar", corrigir ou apagar gasto → use cumprimento (se for saudação) ou fora_contexto.

Palavras-âncora financeiras: gastei, paguei, comprei, ganhei, recebi, reais, R$, limite, orçamento, gasto, despesa, saldo, crédito, fatura, quanto gastei, posso gastar, corrige, apaga, excluir, último gasto.

Regras de intent:
- intent=registrar_gasto quando o usuário informa um ou mais gastos
- intent=registrar_receita quando informa entrada de dinheiro (ex: "ganhei 1000 de salário", "recebi 500 de freelance", "entrou 200 de uma venda", "caiu o salário")
- intent=pagar_fatura quando pagou fatura do cartão (ex: "paguei a fatura do Nubank de 850", "paguei o crédito de 1200", "quitei a fatura")
- intent=consultar_saldo quando quer ver saldo disponível (ex: "qual meu saldo?", "quanto tenho disponível?", "meu saldo atual")
- intent=consultar_credito quando quer ver dívida no crédito (ex: "quanto devo no crédito?", "qual minha dívida no cartão?", "total no crédito")
- intent=consultar_gastos quando pergunta quanto JÁ gastou (hoje/semana/mês)
- intent=consultar_limites quando pergunta sobre limite de gasto, quanto ainda pode/falta gastar, teto ou orçamento
- intent=atualizar_limite_cartao quando quer alterar o limite de um cartão de crédito (ex: "atualiza limite do Nubank para 5000", "limite do cartão Itaú 3000", "muda limite Nubank 4000")
- intent=excluir_ultimo_gasto quando pede para apagar, excluir, desfazer ou remover o último gasto (apenas UM registro)
- intent=corrigir_ultimo_gasto quando pede para corrigir, alterar ou mudar o último gasto
- intent=cumprimento para saudações sem conteúdo financeiro (ex: "oi", "bom dia", "olá bento")
- intent=fora_contexto para qualquer assunto SEM relação com finanças pessoais (ex: clima, notícias, curiosidades, piadas)
- intent=clarificacao_resposta quando o usuário responde apenas com um valor após pedido de clarificação
- confianca: 0.0 a 1.0 — quão certo você está da classificação (1.0 = certeza total)
- valor: extraia números de "30 reais", "R$30", "30,50", "100 conto", "100 pal/pila", ou só "100" após gastei/paguei. null se impossível
- categoria: mapeie para uma das 6 categorias fixas. null se não souber
- periodo: para consultas de gastos ou limites. Default "hoje" se não especificado. null em consultar_limites só se perguntar todos os limites
- precisa_clarificacao: true se intent=registrar_gasto mas algum gasto ficou sem valor
- gastos: use array quando a mensagem tiver VÁRIOS gastos (ex: "gastei 20 com X e 30 com Y"). Cada item separado. Nesse caso, deixe valor/categoria/descricao como null
- gastos: null ou omita quando houver apenas um gasto — use valor/categoria/descricao normalmente
- receitas: use array quando a mensagem tiver VÁRIAS receitas (ex: "recebi 500 de freelance e 200 de venda"). Cada item separado. Nesse caso, deixe valor/income_category/descricao como null
- receitas: null ou omita quando houver apenas uma receita — use valor/income_category/descricao normalmente
- expense_date: data do gasto. Use hoje se não especificado
- payment_method: extraia de "no crédito", "no débito", "no pix", "em dinheiro", "no Nubank", "parcelei". Default null (será 'dinheiro' se registrar_gasto e vier null)
- payment_method 'credito' quando mencionar cartão, crédito, parcelado, ou nome de banco como forma de pagamento
- payment_method 'pix' quando mencionar pix
- payment_method 'debito' quando mencionar débito explicitamente
- payment_method 'dinheiro' quando mencionar dinheiro, espécie, cash, ou quando não mencionar método
- card_name: nome do banco/cartão mencionado (ex: "Nubank", "Itaú", "Inter"). null se só disser "cartão" sem nomear ou se não mencionado
- income_category: mapeie para salário, freelance, venda, investimento, presente ou outros. null se não identificado (será 'outros')
- Data de referência (hoje, fuso America/Sao_Paulo): {{TODAY}}

Exemplos:
"qual a capital da França?" → {"intent":"fora_contexto","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.98,"payment_method":null,"card_name":null,"income_category":null}
"oi bento" → {"intent":"cumprimento","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.99,"payment_method":null,"card_name":null,"income_category":null}
"me conta uma piada" → {"intent":"fora_contexto","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.97,"payment_method":null,"card_name":null,"income_category":null}
"gastei 50 no mercado" → {"intent":"registrar_gasto","valor":50,"categoria":"alimentação","descricao":"mercado","periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.95,"gastos":null,"payment_method":"dinheiro","card_name":null,"income_category":null}
"gastei 120 no cinema no crédito Nubank" → {"intent":"registrar_gasto","valor":120,"categoria":"lazer","descricao":"cinema","periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.94,"gastos":null,"payment_method":"credito","card_name":"Nubank","income_category":null}
"gastei 50 no almoço no débito" → {"intent":"registrar_gasto","valor":50,"categoria":"alimentação","descricao":"almoço","periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.93,"gastos":null,"payment_method":"debito","card_name":null,"income_category":null}
"gastei 200 reais no credito" → {"intent":"registrar_gasto","valor":200,"categoria":"outros","descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.94,"gastos":null,"payment_method":"credito","card_name":null,"income_category":null}
"gastei 100 conto no mercado" → {"intent":"registrar_gasto","valor":100,"categoria":"alimentação","descricao":"mercado","periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.94,"gastos":null,"payment_method":"dinheiro","card_name":null,"income_category":null}
"gastei 50 pal no uber" → {"intent":"registrar_gasto","valor":50,"categoria":"transporte","descricao":"uber","periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.93,"gastos":null,"payment_method":"dinheiro","card_name":null,"income_category":null}
"gastei 20 reais com material escolar e mais 30 reais com lanche" → {"intent":"registrar_gasto","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.94,"gastos":[{"valor":20,"categoria":"outros","descricao":"material escolar","expense_date":null},{"valor":30,"categoria":"alimentação","descricao":"lanche","expense_date":null}],"payment_method":null,"card_name":null,"income_category":null}
"ganhei 1000 de salário" → {"intent":"registrar_receita","valor":1000,"categoria":null,"descricao":"salário","periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.95,"gastos":null,"receitas":null,"payment_method":null,"card_name":null,"income_category":"salário"}
"recebi 500 de freelance" → {"intent":"registrar_receita","valor":500,"categoria":null,"descricao":"freelance","periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.94,"gastos":null,"receitas":null,"payment_method":null,"card_name":null,"income_category":"freelance"}
"recebi 500 de freelance e mais 200 de uma venda" → {"intent":"registrar_receita","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.94,"gastos":null,"receitas":[{"valor":500,"income_category":"freelance","descricao":"freelance","expense_date":null},{"valor":200,"income_category":"venda","descricao":"venda","expense_date":null}],"payment_method":null,"card_name":null,"income_category":null}
"paguei a fatura do Nubank de 850" → {"intent":"pagar_fatura","valor":850,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.95,"payment_method":null,"card_name":"Nubank","income_category":null}
"qual meu saldo?" → {"intent":"consultar_saldo","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.96,"payment_method":null,"card_name":null,"income_category":null}
"quanto devo no crédito?" → {"intent":"consultar_credito","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.95,"payment_method":null,"card_name":null,"income_category":null}
"atualiza limite do Nubank para 5000" → {"intent":"atualizar_limite_cartao","valor":5000,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.94,"payment_method":null,"card_name":"Nubank","income_category":null}
"limite do cartão Itaú 3000" → {"intent":"atualizar_limite_cartao","valor":3000,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.93,"payment_method":null,"card_name":"Itaú","income_category":null}
"quanto ainda posso gastar hoje?" → {"intent":"consultar_limites","valor":null,"categoria":null,"descricao":null,"periodo":"hoje","precisa_clarificacao":false,"expense_date":null,"confianca":0.96,"payment_method":null,"card_name":null,"income_category":null}
"quanto gastei essa semana?" → {"intent":"consultar_gastos","valor":null,"categoria":null,"descricao":null,"periodo":"semana","precisa_clarificacao":false,"expense_date":null,"confianca":0.96,"payment_method":null,"card_name":null,"income_category":null}
"50" (após pedido de valor) → {"intent":"clarificacao_resposta","valor":50,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.90,"payment_method":null,"card_name":null,"income_category":null}
"apaga o último gasto" → {"intent":"excluir_ultimo_gasto","valor":null,"categoria":null,"descricao":null,"periodo":null,"precisa_clarificacao":false,"expense_date":null,"confianca":0.95,"payment_method":null,"card_name":null,"income_category":null}`;

export interface ClassifyMessageResult {
  parsed: ParsedMessage;
  usage: { inputTokens: number; outputTokens: number };
  intentSource: IntentSource;
}

export interface ParseMessageResult {
  parsed: ParsedMessage;
  usage: { inputTokens: number; outputTokens: number };
}

function applyConfidenceFallback(
  parsed: ParsedMessage,
  text: string,
  pendingClarification: boolean
): { parsed: ParsedMessage; intentSource: IntentSource } {
  if (pendingClarification) {
    return { parsed, intentSource: "llm" };
  }

  const confidence = parsed.confianca ?? 1;
  if (confidence >= CONFIDENCE_THRESHOLD) {
    return { parsed, intentSource: "llm" };
  }

  if (!hasFinancialContext(text)) {
    return {
      parsed: { ...parsed, intent: "fora_contexto", confianca: confidence },
      intentSource: "confidence_fallback",
    };
  }

  return { parsed, intentSource: "llm" };
}

async function parseWithLlm(
  text: string,
  pendingClarification: boolean
): Promise<ParseMessageResult> {
  if (!env.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada");
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const userContent = pendingClarification
    ? `[Contexto: aguardando valor do gasto]\n${text}`
    : text;

  let response;
  try {
    response = await withRetry(
      () =>
        client.messages.create(
          {
            model: "claude-haiku-4-5-20251001",
            max_tokens: 768,
            system: SYSTEM_PROMPT.replace("{{TODAY}}", getTodayISO()),
            messages: [{ role: "user", content: userContent }],
          },
          { timeout: 15000 }
        ),
      { attempts: 3, baseDelayMs: 1000, label: "Claude API" }
    );
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.message.includes("timeout"))
    ) {
      throw new Error("Timeout na Claude API após 15s");
    }
    throw err;
  }

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Resposta vazia da Claude API");
  }

  const raw = block.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`JSON inválido da Claude API: ${raw}`);
  }

  const parsed = enrichParsedFromText(
    JSON.parse(jsonMatch[0]) as ParsedMessage,
    text
  );

  if (typeof parsed.confianca !== "number" || parsed.confianca < 0 || parsed.confianca > 1) {
    parsed.confianca = 0.5;
  }

  return {
    parsed,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/** Pré-filtro → LLM → fallback por confiança. Ponto de entrada principal. */
export async function classifyMessage(
  text: string,
  pendingClarification = false
): Promise<ClassifyMessageResult> {
  const prefiltered = prefilterIntent(text, pendingClarification);
  if (prefiltered) {
    return {
      parsed: enrichParsedFromText(prefiltered, text),
      usage: { inputTokens: 0, outputTokens: 0 },
      intentSource: "prefilter",
    };
  }

  const { parsed: llmParsed, usage } = await parseWithLlm(text, pendingClarification);
  const { parsed, intentSource } = applyConfidenceFallback(
    llmParsed,
    text,
    pendingClarification
  );

  return { parsed, usage, intentSource };
}

/** @deprecated Use classifyMessage */
export async function parseMessage(
  text: string,
  pendingClarification = false
): Promise<ParseMessageResult> {
  const result = await classifyMessage(text, pendingClarification);
  return { parsed: result.parsed, usage: result.usage };
}

export function isLowConfidenceAmbiguous(
  parsed: ParsedMessage,
  text: string,
  pendingClarification: boolean
): boolean {
  if (pendingClarification) return false;
  const confidence = parsed.confianca ?? 1;
  return (
    confidence < CONFIDENCE_THRESHOLD &&
    hasFinancialContext(text) &&
    !isFinancialIntent(parsed.intent)
  );
}
