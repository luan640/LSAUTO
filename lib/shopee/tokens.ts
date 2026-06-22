import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopeeShop } from "./types";

// Único módulo que toca a tabela shopee_shops. Sempre via admin client
// (a tabela não tem nenhuma policy de RLS para anon/authenticated).

export async function getShop(shopId: number): Promise<ShopeeShop | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shopee_shops")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getConnectedShop(): Promise<ShopeeShop | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shopee_shops")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveShopTokens(params: {
  shopId: number;
  shopName: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  connectedBy?: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("shopee_shops").upsert(
    {
      shop_id: params.shopId,
      shop_name: params.shopName,
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
      access_token_expires_at: params.accessTokenExpiresAt,
      refresh_token_expires_at: params.refreshTokenExpiresAt,
      connected_by: params.connectedBy,
    },
    { onConflict: "shop_id" },
  );

  if (error) throw new Error(error.message);
}

export async function deleteShop(shopId: number) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("shopee_shops").delete().eq("shop_id", shopId);
  if (error) throw new Error(error.message);
}

export type ShopeeConnectionStatus = {
  shopId: number;
  shopName: string;
  connectedSince: string;
  accessTokenExpiresAt: string;
};

// DTO sem os tokens, seguro para passar a um Server/Client Component.
export async function getConnectionStatus(): Promise<ShopeeConnectionStatus | null> {
  const shop = await getConnectedShop();
  if (!shop) return null;

  return {
    shopId: shop.shop_id,
    shopName: shop.shop_name,
    connectedSince: shop.created_at,
    accessTokenExpiresAt: shop.access_token_expires_at,
  };
}
