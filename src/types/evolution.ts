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
    audioMessage?: unknown;
  };
  messageType?: string;
}
