import { File } from "node:buffer";
import { env } from "../config/env.js";
import { getMediaBase64 } from "./evolution.js";
import type { EvolutionMessageData } from "../types/evolution.js";
import { withRetry } from "../utils/retry.js";

function extensionFromMime(mimetype?: string, convertedToMp4 = false): string {
  if (convertedToMp4) return "mp4";
  if (!mimetype) return "ogg";
  if (mimetype.includes("ogg")) return "ogg";
  if (mimetype.includes("mpeg") || mimetype.includes("mp3")) return "mp3";
  if (mimetype.includes("mp4") || mimetype.includes("m4a")) return "m4a";
  if (mimetype.includes("webm")) return "webm";
  return "ogg";
}

function mimeFromExtension(ext: string): string {
  switch (ext) {
    case "mp4":
    case "m4a":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "webm":
      return "audio/webm";
    default:
      return "audio/ogg";
  }
}

export async function transcribeAudioMessage(
  data: EvolutionMessageData
): Promise<string> {
  const apiKey = env.openaiApiKey.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada para transcrição de áudio");
  }

  const media = await getMediaBase64(data);

  const ext = extensionFromMime(
    media.mimetype,
    media.mimetype?.includes("mp4") ?? false
  );
  const buffer = Buffer.from(media.base64, "base64");

  if (buffer.length === 0) {
    throw new Error("Arquivo de áudio vazio");
  }

  console.log(
    `Áudio baixado: ${buffer.length} bytes, mimetype=${media.mimetype ?? "desconhecido"}`
  );

  const filename = `audio.${ext}`;
  const formData = new FormData();
  formData.append(
    "file",
    new File([buffer], filename, { type: mimeFromExtension(ext) })
  );
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await withRetry(
      () =>
        fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
          signal: controller.signal,
        }),
      { attempts: 2, baseDelayMs: 2000, label: "Whisper API" }
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timeout na Whisper API após 30s");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Whisper API erro ${response.status}: ${body}`);
  }

  const result = (await response.json()) as { text?: string };
  const text = result.text?.trim();

  if (!text) {
    throw new Error("Transcrição vazia");
  }

  return text;
}
