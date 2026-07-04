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
  frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:3001"),
  landingUrl: optionalEnv("LANDING_URL", "http://localhost:3001"),
  stripe: {
    secretKey: optionalEnv("STRIPE_SECRET_KEY", ""),
    webhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET", ""),
    prices: {
      essencialMonthly: optionalEnv("STRIPE_PRICE_ESSENCIAL_MONTHLY", ""),
      essencialYearly: optionalEnv("STRIPE_PRICE_ESSENCIAL_YEARLY", ""),
      proMonthly: optionalEnv("STRIPE_PRICE_PRO_MONTHLY", ""),
      proYearly: optionalEnv("STRIPE_PRICE_PRO_YEARLY", ""),
    },
  },
  ai: {
    usdToBrlRate: parseFloat(optionalEnv("USD_TO_BRL_RATE", "5.00")),
    inputCostPerMtk: parseFloat(optionalEnv("CLAUDE_HAIKU_INPUT_COST_PER_MTK", "1.00")),
    outputCostPerMtk: parseFloat(optionalEnv("CLAUDE_HAIKU_OUTPUT_COST_PER_MTK", "5.00")),
  },
  admin: {
    sessionDurationHours: parseInt(optionalEnv("ADMIN_SESSION_DURATION_HOURS", "8"), 10),
  },
  supportEmail: optionalEnv("SUPPORT_EMAIL", "suporte@bento.com.br"),
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
warnIfMissing(
  "STRIPE_SECRET_KEY",
  env.stripe.secretKey,
  "checkout e assinaturas estarão desativados."
);
