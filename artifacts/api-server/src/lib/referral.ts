import crypto from "crypto";

/**
 * Generate a unique referral code from a Telegram user ID.
 */
export function generateReferralCode(telegramId: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`hustlecoin:${telegramId}`)
    .digest("base64url");
  return hash.slice(0, 8).toUpperCase();
}
