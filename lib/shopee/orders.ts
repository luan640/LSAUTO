import { createAdminClient } from "@/lib/supabase/admin";
import { ensureFreshToken } from "./auth";
import { shopeeShopRequest } from "./client";
import { chunk } from "./util";
import type { ShopeeEscrowDetail, ShopeeOrderDetail } from "./types";

const GET_ORDER_LIST_PATH = "/api/v2/order/get_order_list";
const GET_ORDER_DETAIL_PATH = "/api/v2/order/get_order_detail";
const GET_ESCROW_DETAIL_PATH = "/api/v2/payment/get_escrow_detail";

// A Shopee limita get_order_list a uma janela de tempo por chamada.
const SYNC_WINDOW_DAYS = 15;

type ShopAuth = { shopId: number; accessToken: string };

async function fetchEscrowDetail(shop: ShopAuth, orderSn: string) {
  try {
    const result = await shopeeShopRequest<{ response: ShopeeEscrowDetail }>(
      GET_ESCROW_DETAIL_PATH,
      shop,
      { order_sn: orderSn },
    );
    const income = result.response?.order_income;
    if (!income) return null;

    const feeTotal =
      (income.commission_fee ?? 0) +
      (income.service_fee ?? 0) +
      (income.seller_transaction_fee ?? 0);

    return { amount: income.escrow_amount ?? null, feeTotal, raw: result.response };
  } catch {
    // Pedido pode ainda não ter escrow disponível (ex: não entregue) — ignora.
    return null;
  }
}

async function listRecentOrderSns(shop: ShopAuth): Promise<string[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - SYNC_WINDOW_DAYS * 24 * 60 * 60;

  const orderSns: string[] = [];
  let cursor = "";

  while (true) {
    const list = await shopeeShopRequest<{
      response: {
        order_list: { order_sn: string }[];
        more: boolean;
        next_cursor: string;
      };
    }>(GET_ORDER_LIST_PATH, shop, {
      time_range_field: "create_time",
      time_from: from,
      time_to: now,
      page_size: 50,
      cursor,
    });

    orderSns.push(...list.response.order_list.map((o) => o.order_sn));
    if (!list.response.more) break;
    cursor = list.response.next_cursor;
  }

  return orderSns;
}

// Busca pedidos recentes da loja na Shopee e grava/atualiza em shopee_orders,
// incluindo o detalhamento de taxas via get_escrow_detail.
export async function syncOrders(shopId: number) {
  const { accessToken } = await ensureFreshToken(shopId);
  const shop: ShopAuth = { shopId, accessToken };

  const orderSns = await listRecentOrderSns(shop);
  if (orderSns.length === 0) {
    return { synced: 0 };
  }

  const supabase = createAdminClient();
  let synced = 0;

  for (const batch of chunk(orderSns, 50)) {
    const detail = await shopeeShopRequest<{ response: { order_list: ShopeeOrderDetail[] } }>(
      GET_ORDER_DETAIL_PATH,
      shop,
      {
        order_sn_list: batch.join(","),
        response_optional_fields: "buyer_username,total_amount,create_time,order_status",
      },
    );

    for (const order of detail.response.order_list) {
      const escrow = await fetchEscrowDetail(shop, order.order_sn);

      const { error } = await supabase.from("shopee_orders").upsert(
        {
          shop_id: shopId,
          order_sn: order.order_sn,
          order_status: order.order_status,
          order_total: order.total_amount,
          escrow_amount: escrow?.amount ?? null,
          shopee_fee_total: escrow?.feeTotal ?? null,
          buyer_username: order.buyer_username,
          order_create_time: new Date(order.create_time * 1000).toISOString(),
          raw_payload: { order, escrow: escrow?.raw ?? null },
          synced_at: new Date().toISOString(),
        },
        { onConflict: "order_sn" },
      );

      if (error) throw new Error(error.message);
      synced += 1;
    }
  }

  return { synced };
}
