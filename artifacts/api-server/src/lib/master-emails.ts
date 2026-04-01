/**
 * Master accounts — bypass payment, assigned a fixed tier.
 * To add/remove access, edit this file and redeploy.
 */
export const MASTER_ACCOUNTS: Record<string, "limited" | "unlimited"> = {
  "dev@iacalorias.com.br":    "unlimited",
  "evellyngibulo@gmail.com":  "unlimited",
  "brunogibulo@gmail.com":    "unlimited",
  "misaeltois@gmail.com":     "limited",
};

export function getMasterTier(email?: string | null): "limited" | "unlimited" | null {
  if (!email) return null;
  return MASTER_ACCOUNTS[email.toLowerCase().trim()] ?? null;
}
