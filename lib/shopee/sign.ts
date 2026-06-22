import { createHmac } from "crypto";
import { shopeePartnerId, shopeePartnerKey } from "./config";

// Assinatura para chamadas públicas (auth_partner, token/get, access_token/get):
// HMAC-SHA256(partner_id + path + timestamp)
export function signPublicCall(path: string, timestamp: number) {
  const base = `${shopeePartnerId()}${path}${timestamp}`;
  return createHmac("sha256", shopeePartnerKey()).update(base).digest("hex");
}

// Assinatura para chamadas autenticadas de loja:
// HMAC-SHA256(partner_id + path + timestamp + access_token + shop_id)
export function signShopCall(
  path: string,
  timestamp: number,
  accessToken: string,
  shopId: number,
) {
  const base = `${shopeePartnerId()}${path}${timestamp}${accessToken}${shopId}`;
  return createHmac("sha256", shopeePartnerKey()).update(base).digest("hex");
}
