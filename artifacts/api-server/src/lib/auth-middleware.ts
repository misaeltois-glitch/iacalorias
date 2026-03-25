import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized", message: "Token de autenticação necessário." });
      return;
    }
    next();
  });
}
