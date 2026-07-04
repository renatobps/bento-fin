import type { EvolutionMessageData } from "../types/evolution.js";
import { normalizeButtonReply } from "../utils/yes-no-response.js";

interface ButtonSelection {
  id?: string;
  text?: string;
}

function extractButtonSelection(data: EvolutionMessageData): ButtonSelection | null {
  const msg = data.message;
  if (!msg) return null;

  if (msg.buttonsResponseMessage) {
    return {
      id: msg.buttonsResponseMessage.selectedButtonId,
      text: msg.buttonsResponseMessage.selectedDisplayText,
    };
  }

  if (msg.templateButtonReplyMessage) {
    return {
      id: msg.templateButtonReplyMessage.selectedId,
      text: msg.templateButtonReplyMessage.selectedDisplayText,
    };
  }

  const interactive = msg.interactiveResponseMessage;
  if (interactive?.body?.text) {
    return { text: interactive.body.text };
  }

  return null;
}

export function isButtonResponse(data: EvolutionMessageData): boolean {
  return (
    data.messageType === "buttonsResponseMessage" ||
    data.messageType === "templateButtonReplyMessage" ||
    data.messageType === "interactiveResponseMessage" ||
    !!data.message?.buttonsResponseMessage ||
    !!data.message?.templateButtonReplyMessage ||
    !!data.message?.interactiveResponseMessage
  );
}

export function extractText(data: EvolutionMessageData): string | null {
  const button = extractButtonSelection(data);
  if (button) {
    const normalized = normalizeButtonReply(button.id, button.text);
    if (normalized) return normalized;
  }

  if (data.message?.conversation) {
    return data.message.conversation;
  }

  if (data.message?.extendedTextMessage?.text) {
    return data.message.extendedTextMessage.text;
  }

  return null;
}

export function isAudioMessage(data: EvolutionMessageData): boolean {
  return (
    data.messageType === "audioMessage" || !!data.message?.audioMessage
  );
}

export function isProcessableMessage(data: EvolutionMessageData): boolean {
  if (data.key.fromMe) return false;
  return !!extractText(data) || isAudioMessage(data) || isButtonResponse(data);
}
