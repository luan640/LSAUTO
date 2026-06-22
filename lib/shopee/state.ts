import { randomBytes, timingSafeEqual } from "crypto";

export const OAUTH_STATE_COOKIE = "shopee_oauth_state";

export function generateState() {
  return randomBytes(16).toString("hex");
}

export function isValidState(cookieValue: string | undefined, queryValue: string | null) {
  if (!cookieValue || !queryValue) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(queryValue);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
