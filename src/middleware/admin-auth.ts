import type { Request, Response, NextFunction } from "express";
import { validateAdminSession, getAdminById } from "../repositories/admin.js";

export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token admin ausente" });
    return;
  }

  const token = header.slice(7);
  const adminId = await validateAdminSession(token);
  if (!adminId) {
    res.status(401).json({ error: "Sessão admin inválida ou expirada" });
    return;
  }

  const admin = await getAdminById(adminId);
  if (!admin) {
    res.status(401).json({ error: "Admin não encontrado" });
    return;
  }

  req.adminId = adminId;
  next();
}
