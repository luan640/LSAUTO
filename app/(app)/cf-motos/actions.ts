"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectedShop } from "@/lib/shopee/tokens";
import { syncOrders } from "@/lib/shopee/orders";
import type { CfMotoSaleInput } from "@/lib/types";

function parseCfMotoSaleInput(formData: FormData): CfMotoSaleInput {
  return {
    sale_date: String(formData.get("sale_date") ?? ""),
    sale_value: Number(formData.get("sale_value")) || 0,
    cost: Number(formData.get("cost")) || 0,
    shopee_fee: Number(formData.get("shopee_fee")) || 0,
    product_reference: String(formData.get("product_reference") ?? "").trim(),
  };
}

function toFriendlyError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Este link de venda já foi cadastrado");
  }
  return new Error(error.message);
}

export async function createCfMotoSale(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sale = parseCfMotoSaleInput(formData);

  const { error } = await supabase
    .from("cf_moto_sales")
    .insert({ ...sale, created_by: user?.id });

  if (error) {
    throw toFriendlyError(error);
  }

  revalidatePath("/cf-motos/vendas");
}

export async function updateCfMotoSale(id: string, formData: FormData) {
  const supabase = await createClient();
  const sale = parseCfMotoSaleInput(formData);

  const { error } = await supabase.from("cf_moto_sales").update(sale).eq("id", id);

  if (error) {
    throw toFriendlyError(error);
  }

  revalidatePath("/cf-motos/vendas");
}

export async function deleteCfMotoSale(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cf_moto_sales").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/vendas");
}

// Cria uma venda CF Motos a partir de um pedido Shopee já sincronizado,
// preenchendo sale_value/shopee_fee automaticamente a partir do escrow detail.
// O custo de compra não vem da Shopee e continua manual.
export async function importShopeeOrderToSale(shopeeOrderId: string) {
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("shopee_orders")
    .select("*")
    .eq("id", shopeeOrderId)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }
  if (order.linked_cf_moto_sale_id) {
    throw new Error("Este pedido já foi importado");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const saleDate = order.order_create_time
    ? String(order.order_create_time).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const { data: sale, error: saleError } = await supabase
    .from("cf_moto_sales")
    .insert({
      sale_date: saleDate,
      sale_value: order.order_total,
      cost: 0,
      shopee_fee: order.shopee_fee_total ?? 0,
      product_reference: "",
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (saleError) {
    throw toFriendlyError(saleError);
  }

  const { error: linkError } = await admin
    .from("shopee_orders")
    .update({ linked_cf_moto_sale_id: sale.id })
    .eq("id", shopeeOrderId);

  if (linkError) {
    throw new Error(linkError.message);
  }

  revalidatePath("/cf-motos/vendas");
  revalidatePath("/cf-motos/vendas-shopee");
}

export async function syncShopeeOrders() {
  const shop = await getConnectedShop();
  if (!shop) {
    throw new Error("Nenhuma loja Shopee conectada");
  }

  const result = await syncOrders(shop.shop_id);
  revalidatePath("/cf-motos/vendas-shopee");
  return result;
}
