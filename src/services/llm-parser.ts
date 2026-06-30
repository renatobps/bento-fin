import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import type { ParsedMessage } from "../types/parsed-message.js";

const SYSTEM_PROMPT = `Você é o parser do Bento, um assistente financeiro via WhatsApp.
Analise a mensagem do usuário e retorne APENAS um JSON válido (sem markdown) com os campos:

{
  "intent": "registrar_gasto" | "consultar_gastos" | "fora_contexto" | "clarificacao_resposta",
  "valor": number | null,
  "categoria": "alimentação" | "transporte" | "lazer" | "saúde" | "moradia" | "outros" | null,
  "descricao": string | null,
  "periodo": "hoje" | "semana" | "mes" | null,
  "precisa_clarificacao": boolean,
  "expense_date": "YYYY-MM-DD" | null
}

Regras:
- intent=registrar_gasto quando o usuário informa um gasto
- intent=consultar_gastos quando pergunta quanto gastou (hoje/semana/mês)
- intent=fora_contexto para mensagens não relacionadas a gastos
- intent=clarificacao_resposta quando o usuário responde apenas com um valor após pedido de clarificação
- valor: extraia números de formatos como "30 reais", "R$30", "30,50", "trinta reais". null se impossível
- categoria: mapeie para uma das 6 categorias fixas. Se não souber, use null (será "outros")
- periodo: para consultas, identifique o período. Default "hoje" se não especificado
- precisa_clarificacao: true se intent=registrar_gasto mas valor é null
- expense_date: data do gasto. Use hoje se não especificado. Interprete "ontem", "hoje", etc.
- Data de referência (hoje): {{TODAY}}`;

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function parseMessage(
  text: string,
  pendingClarification = false
): Promise<ParsedMessage> {
  if (!env.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada");
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const userContent = pendingClarification
    ? `[Contexto: aguardando valor do gasto]\n${text}`
    : text;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT.replace("{{TODAY}}", getTodayISO()),
    messages: [{ role: "user", content: userContent }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Resposta vazia da Claude API");
  }

  const raw = block.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`JSON inválido da Claude API: ${raw}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as ParsedMessage;
  return parsed;
}
