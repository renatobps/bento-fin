import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: parseInt(optionalEnv("PORT", "3000"), 10),
  databaseUrl: requireEnv("DATABASE_URL"),
  whatsapp: {
    lojaPhone: optionalEnv("LOJA_WHATSAPP", ""),
    apiUrl: requireEnv("WHATSAPP_API_URL"),
    apiKey: requireEnv("WHATSAPP_API_KEY"),
    instanceName: requireEnv("WHATSAPP_INSTANCE_NAME"),
    webhookUrl: optionalEnv("WHATSAPP_WEBHOOK_URL", ""),
  },
  anthropicApiKey: optionalEnv("ANTHROPIC_API_KEY", ""),
  openaiApiKey: optionalEnv("OPENAI_API_KEY", ""),
};
