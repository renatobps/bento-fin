export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  /** Formato varia entre Evolution v2 e Evolution GO — use normalizeMessageData. */
  data: unknown;
}

export interface EvolutionMessageData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    buttonsResponseMessage?: {
      selectedButtonId?: string;
      selectedDisplayText?: string;
    };
    templateButtonReplyMessage?: {
      selectedId?: string;
      selectedDisplayText?: string;
    };
    interactiveResponseMessage?: {
      body?: { text?: string };
      nativeFlowResponseMessage?: { name?: string; paramsJson?: string };
    };
    audioMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
      ptt?: boolean;
    };
  };
  messageType?: string;
  messageTimestamp?: string | number;
}
