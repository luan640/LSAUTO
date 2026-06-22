import { shopeeApiHost, shopeePartnerId, shopeeRedirectUrl } from "./config";
import { signPublicCall } from "./sign";
import { shopeePublicRequest, shopeeShopRequest } from "./client";
import { getShop, saveShopTokens } from "./tokens";
import type { ShopeeTokenResponse } from "./types";

const AUTH_PARTNER_PATH = "/api/v2/shop/auth_partner";
const TOKEN_GET_PATH = "/api/v2/auth/token/get";
const ACCESS_TOKEN_GET_PATH = "/api/v2/auth/access_token/get";
const GET_SHOP_INFO_PATH = "/api/v2/shop/get_shop_info";

// Margem de segurança antes de considerar o access_token expirado.
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function buildAuthPartnerUrl(state: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(shopeeApiHost() + AUTH_PARTNER_PATH);
  url.searchParams.set("partner_id", String(shopeePartnerId()));
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", signPublicCall(AUTH_PARTNER_PATH, timestamp));

  // A Shopee não suporta um parâmetro "state" próprio — ela só preserva o
  // que já estiver embutido na própria URL de redirect, completando com
  // code/shop_id. Por isso o state vai dentro do redirect, não como irmão.
  const redirectUrl = new URL(shopeeRedirectUrl());
  redirectUrl.searchParams.set("state", state);
  url.searchParams.set("redirect", redirectUrl.toString());

  return url.toString();
}

function tokenExpiryIso(expireInSeconds: number) {
  return new Date(Date.now() + expireInSeconds * 1000).toISOString();
}

export async function exchangeCodeForToken(params: {
  code: string;
  shopId: number;
  connectedBy?: string;
}) {
  const response = await shopeePublicRequest<ShopeeTokenResponse>(TOKEN_GET_PATH, {
    code: params.code,
    shop_id: params.shopId,
  });

  if (!response.access_token) {
    throw new Error(response.message ?? "Falha ao obter token da Shopee");
  }

  const shopName = await getShopName(params.shopId, response.access_token);

  await saveShopTokens({
    shopId: params.shopId,
    shopName,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresAt: tokenExpiryIso(response.expire_in),
    refreshTokenExpiresAt: tokenExpiryIso(30 * 24 * 60 * 60),
    connectedBy: params.connectedBy,
  });

  return response;
}

async function getShopName(shopId: number, accessToken: string) {
  try {
    const info = await shopeeShopRequest<{ shop_name?: string }>(
      GET_SHOP_INFO_PATH,
      { shopId, accessToken },
    );
    return info.shop_name ?? "";
  } catch {
    return "";
  }
}

async function refreshAccessToken(shopId: number, refreshToken: string, shopName: string) {
  const response = await shopeePublicRequest<ShopeeTokenResponse>(ACCESS_TOKEN_GET_PATH, {
    refresh_token: refreshToken,
    shop_id: shopId,
  });

  if (!response.access_token) {
    throw new Error(response.message ?? "Falha ao renovar token da Shopee");
  }

  await saveShopTokens({
    shopId,
    shopName,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresAt: tokenExpiryIso(response.expire_in),
    refreshTokenExpiresAt: tokenExpiryIso(30 * 24 * 60 * 60),
  });

  return response;
}

// Garante um access_token válido para a loja, renovando sob demanda se
// estiver perto de expirar. Deve ser chamado antes de qualquer chamada
// autenticada de loja (orders, products, etc).
export async function ensureFreshToken(shopId: number) {
  const shop = await getShop(shopId);
  if (!shop) {
    throw new Error("Loja Shopee não conectada");
  }

  const expiresAt = new Date(shop.access_token_expires_at).getTime();
  if (expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return { shopId: shop.shop_id, accessToken: shop.access_token };
  }

  const refreshed = await refreshAccessToken(shopId, shop.refresh_token, shop.shop_name);
  return { shopId, accessToken: refreshed.access_token };
}
