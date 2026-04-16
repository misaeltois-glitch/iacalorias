/**
 * Master accounts — bypass payment, assigned a fixed tier.
 * To add/remove access, edit this file and redeploy.
 * Optional expiresAt (ISO date): after that date the account falls back to free.
 */
interface MasterConfig {
  tier: "limited" | "unlimited";
  expiresAt?: string; // YYYY-MM-DD, exclusive upper bound
}

const MASTER_ACCOUNTS: Record<string, MasterConfig> = {
  "dev@iacalorias.com.br":        { tier: "unlimited" },
  "evellyngibulo@gmail.com":      { tier: "unlimited" },
  "brunogibulo@gmail.com":        { tier: "unlimited" },
  "misaeltois@gmail.com":         { tier: "unlimited" },
  "comercial@comercial.com.br":   { tier: "unlimited", expiresAt: "2026-04-17" },
};

export function getMasterTier(email?: string | null): "limited" | "unlimited" | null {
  if (!email) return null;
  const config = MASTER_ACCOUNTS[email.toLowerCase().trim()];
  if (!config) return null;
  if (config.expiresAt && new Date() >= new Date(config.expiresAt)) return null;
  return config.tier;
}
