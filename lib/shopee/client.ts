import { shopeeApiHost, shopeePartnerId } from "./config";
import { signPublicCall, signShopCall } from "./sign";

export class ShopeeApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message || code);
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (json.error) {
    throw new ShopeeApiError(json.error, json.message, json.request_id);
  }
  return json as T;
}

// Chamada pública (sem shop_id/access_token) — usada no fluxo de auth.
// `body` vai como JSON no corpo do POST (ex: troca/renovação de token).
export async function shopeePublicRequest<T>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(shopeeApiHost() + path);
  url.searchParams.set("partner_id", String(shopeePartnerId()));
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", signPublicCall(path, timestamp));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partner_id: shopeePartnerId(), ...body }),
  });
  return parseResponse<T>(res);
}

// Chamada autenticada de loja (orders, products, etc).
export async function shopeeShopRequest<T>(
  path: string,
  shop: { shopId: number; accessToken: string },
  query: Record<string, string | number> = {},
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(shopeeApiHost() + path);
  url.searchParams.set("partner_id", String(shopeePartnerId()));
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set(
    "sign",
    signShopCall(path, timestamp, shop.accessToken, shop.shopId),
  );
  url.searchParams.set("access_token", shop.accessToken);
  url.searchParams.set("shop_id", String(shop.shopId));
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url);
  return parseResponse<T>(res);
}
