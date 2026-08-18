import type { EvolutionMessageData } from "../types/evolution.js";

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(source: RawRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

/**
 * O Evolution GO serializa o conteúdo da mensagem direto do whatsmeow, que
 * conforme a versão usa chaves capitalizadas (`Conversation`) em vez das
 * camelCase do protobuf (`conversation`).
 */
function lowerCaseKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(lowerCaseKeysDeep);
  if (!isRecord(value)) return value;

  const result: RawRecord = {};
  for (const [key, item] of Object.entries(value)) {
    result[key.charAt(0).toLowerCase() + key.slice(1)] = lowerCaseKeysDeep(item);
  }
  return result;
}

/**
 * Converte o payload do webhook para o formato interno.
 *
 * Aceita tanto o formato Baileys (`{ key, message }`, usado pela Evolution v2)
 * quanto o do whatsmeow (`{ Info, Message }`, usado pelo Evolution GO).
 * Retorna null quando o payload não é uma mensagem reconhecível.
 */
export function normalizeMessageData(raw: unknown): EvolutionMessageData | null {
  if (!isRecord(raw)) return null;

  if (isRecord(raw.key)) {
    return raw as unknown as EvolutionMessageData;
  }

  const info = pick(raw, "Info", "info", "messageInfo", "MessageInfo");
  if (!isRecord(info)) return null;

  const remoteJid = asString(
    pick(info, "Chat", "chat", "RemoteJid", "remoteJid", "Sender", "sender")
  );
  const id = asString(pick(info, "ID", "Id", "id"));
  if (!remoteJid || !id) return null;

  const message = lowerCaseKeysDeep(pick(raw, "Message", "message"));

  return {
    key: {
      remoteJid,
      fromMe: pick(info, "IsFromMe", "isFromMe", "fromMe") === true,
      id,
    },
    pushName: asString(pick(info, "PushName", "pushName", "Notify", "notify")),
    message: isRecord(message)
      ? (message as EvolutionMessageData["message"])
      : undefined,
    messageType: asString(
      pick(info, "MediaType", "mediaType", "Type", "type", "messageType")
    ),
    messageTimestamp: asString(
      pick(info, "Timestamp", "timestamp", "messageTimestamp")
    ),
  };
}
