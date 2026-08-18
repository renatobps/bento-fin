import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import {
  getUserSubscription,
  getUserByStripeCustomerId,
  setStripeCustomerId,
  updateUserSubscription,
  type SubscriptionPlan,
} from "../repositories/subscription.js";
import { sendWhatsAppText } from "../services/evolution.js";
import { personalizeMessage } from "../utils/user-display.js";

function getStripe(): Stripe {
  if (!env.stripe.secretKey) {
    throw new Error("Stripe não configurado");
  }
  return new Stripe(env.stripe.secretKey);
}

function planFromPriceId(priceId: string): SubscriptionPlan | null {
  const { prices } = env.stripe;
  if (priceId === prices.essencialMonthly || priceId === prices.essencialYearly) {
    return "essencial";
  }
  if (priceId === prices.proMonthly || priceId === prices.proYearly) {
    return "pro";
  }
  return null;
}

function getPriceId(plan: "essencial" | "pro", interval: "monthly" | "yearly"): string {
  const map = {
    essencial: {
      monthly: env.stripe.prices.essencialMonthly,
      yearly: env.stripe.prices.essencialYearly,
    },
    pro: {
      monthly: env.stripe.prices.proMonthly,
      yearly: env.stripe.prices.proYearly,
    },
  };
  const priceId = map[plan][interval];
  if (!priceId) {
    throw new Error(`Price ID não configurado para ${plan} ${interval}`);
  }
  return priceId;
}

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "incomplete" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled") return "canceled";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "incomplete";
}

function getPeriodEnd(subscription: Stripe.Subscription): Date {
  const raw = subscription as Stripe.Subscription & { current_period_end?: number };
  if (typeof raw.current_period_end === "number") {
    return new Date(raw.current_period_end * 1000);
  }
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null;
  };
  if (!raw.subscription) return null;
  return typeof raw.subscription === "string" ? raw.subscription : raw.subscription.id;
}

async function applySubscriptionFromStripe(
  userId: number,
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const plan = planFromPriceId(priceId) ?? "essencial";
  const expiresAt = getPeriodEnd(subscription);

  await updateUserSubscription(userId, {
    plan,
    status: mapSubscriptionStatus(subscription.status),
    expiresAt,
    stripeSubscriptionId: subscription.id,
  });
}

export async function getSubscriptionBillingInterval(
  stripeSubscriptionId: string | null
): Promise<"monthly" | "yearly" | null> {
  if (!stripeSubscriptionId || !env.stripe.secretKey) return null;

  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const priceId = subscription.items.data[0]?.price.id ?? "";
    const { prices } = env.stripe;

    if (priceId === prices.essencialYearly || priceId === prices.proYearly) {
      return "yearly";
    }
    if (priceId === prices.essencialMonthly || priceId === prices.proMonthly) {
      return "monthly";
    }

    const recurring = subscription.items.data[0]?.price.recurring;
    if (recurring?.interval === "year") return "yearly";
    if (recurring?.interval === "month") return "monthly";
    return null;
  } catch (err) {
    console.error("Erro ao buscar intervalo da assinatura:", err);
    return null;
  }
}

async function sendPlanWelcomeMessage(
  userId: number,
  plan: SubscriptionPlan
): Promise<void> {
  const user = await getUserSubscription(userId);
  if (!user) return;

  const planLabel = plan === "pro" ? "Pro" : "Essencial";
  const text = personalizeMessage(
    user.name,
    `🎉 Assinatura ativada! Bem-vindo ao plano *${planLabel}*.\n\n` +
      `Agora você tem acesso a:\n` +
      (plan === "pro"
        ? "• Gastos e receitas ilimitados\n• Áudio no WhatsApp\n• Exportação PDF/CSV\n• Suporte prioritário"
        : "• Gastos e receitas ilimitados\n• Áudio no WhatsApp\n• Dashboard completo\n• Cartões de crédito e limites")
  );

  await sendWhatsAppText({ phone: user.phone, text });
}

export async function createCheckoutSession(
  userId: number,
  plan: "essencial" | "pro",
  interval: "monthly" | "yearly"
): Promise<string> {
  const stripe = getStripe();
  const user = await getUserSubscription(userId);
  if (!user) throw new Error("Usuário não encontrado");

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { userId: String(userId) },
      phone: user.phone,
      name: user.name ?? undefined,
    });
    customerId = customer.id;
    await setStripeCustomerId(userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: getPriceId(plan, interval), quantity: 1 }],
    success_url: `${env.frontendUrl}/dashboard?upgrade=success&plan=${plan}`,
    cancel_url: `${env.frontendUrl}/planos`,
    metadata: { userId: String(userId), plan },
    subscription_data: {
      metadata: { userId: String(userId), plan },
    },
  });

  if (!session.url) {
    throw new Error("Falha ao criar sessão de checkout");
  }
  return session.url;
}

export async function createPortalSession(userId: number): Promise<string> {
  const stripe = getStripe();
  const user = await getUserSubscription(userId);
  if (!user?.stripe_customer_id) {
    throw new Error("Cliente Stripe não encontrado");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${env.frontendUrl}/planos`,
  });

  return session.url;
}

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post("/", async (req: Request, res: Response) => {
  if (!env.stripe.webhookSecret) {
    res.status(503).json({ error: "Webhook Stripe não configurado" });
    return;
  }

  const stripe = getStripe();
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).json({ error: "Assinatura ausente" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.stripe.webhookSecret
    );
  } catch (err) {
    console.error("Webhook Stripe inválido:", err);
    res.status(400).json({ error: "Assinatura inválida" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId ?? "0", 10);
        if (!userId) break;

        if (session.subscription && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscriptionFromStripe(userId, subscription);

          const plan =
            (session.metadata?.plan as SubscriptionPlan) ??
            planFromPriceId(subscription.items.data[0]?.price.id ?? "") ??
            "essencial";
          await sendPlanWelcomeMessage(userId, plan);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await applySubscriptionFromStripe(user.id, subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await updateUserSubscription(user.id, {
            status: "canceled",
            expiresAt: getPeriodEnd(subscription),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId) break;
        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await updateUserSubscription(user.id, { status: "past_due" });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId) break;

        const subId = getInvoiceSubscriptionId(invoice);
        if (!subId) break;

        const user = await getUserByStripeCustomerId(customerId);
        if (!user) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        await applySubscriptionFromStripe(user.id, subscription);
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`Erro ao processar evento Stripe ${event.type}:`, err);
    res.status(500).json({ error: "Falha ao processar webhook" });
  }
});
