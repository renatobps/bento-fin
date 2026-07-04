import type { Request, Response, NextFunction } from "express";
import { getUserSubscription, checkPlanAccess, type SubscriptionPlan } from "../repositories/subscription.js";
import { env } from "../config/env.js";

export function requirePlan(minPlan: SubscriptionPlan) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await getUserSubscription(req.auth!.userId);
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }

      const allowed = checkPlanAccess(
        user.subscription_plan,
        user.subscription_status,
        minPlan,
        user.subscription_expires_at
      );

      if (!allowed) {
        res.status(403).json({
          error: "Plano insuficiente",
          upgradeUrl: `${env.frontendUrl}/planos`,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("Erro ao verificar plano:", err);
      res.status(500).json({ error: "Falha ao verificar plano" });
    }
  };
}
