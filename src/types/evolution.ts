export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessageData | EvolutionMessageData[];
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
    audioMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
      ptt?: boolean;
    };
  };
  messageType?: string;
}
