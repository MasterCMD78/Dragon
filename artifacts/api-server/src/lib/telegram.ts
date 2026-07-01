import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface ParsedInitData {
  user: TelegramUser;
  chat_instance?: string;
  chat_type?: string;
  start_param?: string;
  auth_date: number;
  hash: string;
}

/**
 * Validate Telegram Web App initData using HMAC-SHA256.
 * Returns the parsed data if valid, throws if invalid.
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
): ParsedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Missing hash in initData");
  }

  params.delete("hash");

  // Sort params alphabetically and build the check string
  const checkArr: string[] = [];
  params.forEach((val, key) => {
    checkArr.push(`${key}=${val}`);
  });
  checkArr.sort();
  const checkString = checkArr.join("\n");

  // HMAC-SHA256 with key = HMAC-SHA256("WebAppData", botToken)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  if (expectedHash !== hash) {
    throw new Error("Invalid Telegram initData signature");
  }

  // Check auth_date is not too old (allow 1 hour)
  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600) {
    throw new Error("Telegram initData expired");
  }

  const userStr = params.get("user");
  if (!userStr) {
    throw new Error("Missing user in initData");
  }

  const user: TelegramUser = JSON.parse(userStr);

  return {
    user,
    chat_instance: params.get("chat_instance") ?? undefined,
    chat_type: params.get("chat_type") ?? undefined,
    start_param: params.get("start_param") ?? undefined,
    auth_date: authDate,
    hash,
  };
}
