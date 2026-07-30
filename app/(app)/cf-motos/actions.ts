"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectedShop } from "@/lib/shopee/tokens";
import { syncOrders } from "@/lib/shopee/orders";
import { CF_MOTO_SALE_STATUSES, type CfMotoSaleInput, type CfMotoSaleStatus } from "@/lib/types";

function parseCfMotoSaleInput(formData: FormData): CfMotoSaleInput {
  const status = String(formData.get("status") ?? "");

  return {
    sale_date: String(formData.get("sale_date") ?? ""),
    sale_value: Number(formData.get("sale_value")) || 0,
    cost: Number(formData.get("cost")) || 0,
    shopee_fee: Number(formData.get("shopee_fee")) || 0,
    product_reference: String(formData.get("product_reference") ?? "").trim(),
    status: (CF_MOTO_SALE_STATUSES as readonly string[]).includes(status)
      ? (status as CfMotoSaleStatus)
      : "finalizado",
  };
}

function toFriendlyError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Este link de venda já foi cadastrado");
  }
  return new Error(error.message);
}

type SaleItemInput = { product_id: string; quantity: number };

function parseCfMotoSaleItems(formData: FormData): SaleItemInput[] {
  const raw = String(formData.get("items") ?? "");
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as { product_id?: unknown; quantity?: unknown }[];
    return parsed
      .map((item) => ({
        product_id: String(item.product_id ?? ""),
        quantity: Number(item.quantity) || 0,
      }))
      .filter((item) => item.product_id && item.quantity > 0);
  } catch {
    return [];
  }
}

// Busca o valor médio atual de cada produto no estoque (cf_moto_stock_summary) e
// monta os itens com o custo médio "congelado" no momento da venda.
async function buildSaleItemsWithCost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: SaleItemInput[],
) {
  const productIds = items.map((item) => item.product_id);

  const { data: summary, error } = await supabase
    .from("cf_moto_stock_summary")
    .select("product_id, average_value")
    .in("product_id", productIds);

  if (error) {
    throw new Error(error.message);
  }

  const averageByProduct = new Map(
    (summary ?? []).map((row) => [row.product_id as string, Number(row.average_value) || 0]),
  );

  return items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_cost: averageByProduct.get(item.product_id) ?? 0,
  }));
}

export async function createCfMotoSale(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = parseCfMotoSaleItems(formData);
  if (items.length === 0) {
    throw new Error("Selecione ao menos um produto do estoque e a quantidade");
  }

  const itemsWithCost = await buildSaleItemsWithCost(supabase, items);
  const computedCost = itemsWithCost.reduce(
    (acc, item) => acc + item.quantity * item.unit_cost,
    0,
  );

  const sale = parseCfMotoSaleInput(formData);
  sale.cost = computedCost;

  const { data: inserted, error } = await supabase
    .from("cf_moto_sales")
    .insert({ ...sale, created_by: user?.id })
    .select("id")
    .single();

  if (error) {
    throw toFriendlyError(error);
  }

  const { error: itemsError } = await supabase
    .from("cf_moto_sale_items")
    .insert(itemsWithCost.map((item) => ({ ...item, sale_id: inserted.id })));

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  revalidatePath("/cf-motos/vendas");
  revalidatePath("/cf-motos/estoque");
}

export async function updateCfMotoSale(id: string, formData: FormData) {
  const supabase = await createClient();
  const items = parseCfMotoSaleItems(formData);
  const sale = parseCfMotoSaleInput(formData);

  let itemsWithCost: Awaited<ReturnType<typeof buildSaleItemsWithCost>> = [];
  if (items.length > 0) {
    itemsWithCost = await buildSaleItemsWithCost(supabase, items);
    sale.cost = itemsWithCost.reduce((acc, item) => acc + item.quantity * item.unit_cost, 0);
  }

  const { error } = await supabase.from("cf_moto_sales").update(sale).eq("id", id);

  if (error) {
    throw toFriendlyError(error);
  }

  if (items.length > 0) {
    const { error: deleteError } = await supabase
      .from("cf_moto_sale_items")
      .delete()
      .eq("sale_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { error: itemsError } = await supabase
      .from("cf_moto_sale_items")
      .insert(itemsWithCost.map((item) => ({ ...item, sale_id: id })));

    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  revalidatePath("/cf-motos/vendas");
  revalidatePath("/cf-motos/estoque");
}

export async function deleteCfMotoSale(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cf_moto_sales").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/vendas");
  revalidatePath("/cf-motos/estoque");
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

export async function updateShopeeOrderProductCost(orderId: string, cost: number | null) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("shopee_orders")
    .update({ product_cost: cost })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

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
