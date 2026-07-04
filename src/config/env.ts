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
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
  openaiApiKey: optionalEnv("OPENAI_API_KEY", ""),
  jwtSecret: requireEnv("JWT_SECRET"),
  corsOrigins: optionalEnv("CORS_ORIGIN", "http://localhost:3001")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};

function warnIfMissing(name: string, value: string, message: string): void {
  if (!value.trim()) {
    console.warn(`[AVISO] ${name} não configurada — ${message}`);
  }
}

warnIfMissing(
  "OPENAI_API_KEY",
  env.openaiApiKey,
  "transcrição de áudio estará desativada."
);
