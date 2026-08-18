import type { AuthPayload } from "./middleware/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      adminId?: number;
    }
  }
}

export {};
