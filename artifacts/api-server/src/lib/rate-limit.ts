import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpa entradas expiradas a cada 5 minutos para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

function getKey(req: Request, prefix: string): string {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";
  return `${prefix}:${ip}`;
}

export function rateLimit(options: {
  prefix: string;
  maxRequests: number;
  windowMs: number;
  message?: string;
}) {
  const { prefix, maxRequests, windowMs, message = "Muitas requisições. Tente novamente mais tarde." } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getKey(req, prefix);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ error: "rate_limited", message });
      return;
    }

    entry.count++;
    next();
  };
}

// Limites pré-configurados para as rotas principais
export const analysisRateLimit = rateLimit({
  prefix: "analysis",
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 análises por minuto por IP
  message: "Limite de análises atingido. Aguarde 1 minuto.",
});

export const authRateLimit = rateLimit({
  prefix: "auth",
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 10 tentativas de login por 15 minutos por IP
  message: "Muitas tentativas de login. Aguarde 15 minutos.",
});

export const generalRateLimit = rateLimit({
  prefix: "general",
  maxRequests: 120,
  windowMs: 60 * 1000, // 120 req/min por IP para rotas gerais
});
