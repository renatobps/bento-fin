import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { getUserById } from "../repositories/users.js";

export interface AuthPayload {
  userId: number;
  phone: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.jwtSecret) as AuthPayload;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token ausente" });
    return;
  }

  try {
    const token = header.slice(7);
    req.auth = verifyToken(token);

    const user = await getUserById(req.auth.userId);
    if (!user) {
      res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
      return;
    }

    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
