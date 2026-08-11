"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectedShop } from "@/lib/shopee/tokens";
import { syncOrders } from "@/lib/shopee/orders";
import { CF_MOTO_SALE_STATUSES, type CfMotoSaleInput, type CfMotoSaleStatus } from "@/lib/types";
import { computeLifoCosts, type LedgerEvent } from "@/lib/stock/lifo-cost";

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

export type SaleItemInput = { product_id: string; quantity: number };

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

// Garante que a quantidade vendida de cada produto não passe do estoque disponível
// agora. Ao editar uma venda, devolve ao saldo disponível a quantidade que os itens
// atuais dessa venda já haviam consumido, já que eles serão substituídos.
async function assertStockAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: SaleItemInput[],
  excludeSaleId?: string,
) {
  const productIds = [...new Set(items.map((item) => item.product_id))];

  const [{ data: summary, error: summaryError }, { data: excludedItems, error: excludedError }] =
    await Promise.all([
      supabase
        .from("cf_moto_stock_summary")
        .select("product_id, product_name, quantity")
        .in("product_id", productIds),
      excludeSaleId
        ? supabase.from("cf_moto_sale_items").select("product_id, quantity").eq("sale_id", excludeSaleId)
        : Promise.resolve({ data: [] as { product_id: string; quantity: number }[], error: null }),
    ]);

  if (summaryError) {
    throw new Error(summaryError.message);
  }
  if (excludedError) {
    throw new Error(excludedError.message);
  }

  const returnedByProduct = new Map<string, number>();
  for (const row of excludedItems ?? []) {
    returnedByProduct.set(
      row.product_id,
      (returnedByProduct.get(row.product_id) ?? 0) + (Number(row.quantity) || 0),
    );
  }

  const requestedByProduct = new Map<string, number>();
  for (const item of items) {
    requestedByProduct.set(
      item.product_id,
      (requestedByProduct.get(item.product_id) ?? 0) + item.quantity,
    );
  }

  for (const row of summary ?? []) {
    const requested = requestedByProduct.get(row.product_id);
    if (!requested) continue;

    const available = (Number(row.quantity) || 0) + (returnedByProduct.get(row.product_id) ?? 0);
    if (requested > available) {
      throw new Error(
        `Quantidade de "${row.product_name}" (${requested}) maior que o estoque disponível (${available})`,
      );
    }
  }
}

// Simula o consumo de estoque em pilha (LIFO) até o momento da venda (asOfCreatedAt)
// e monta os itens com o custo resultante "congelado" no momento da venda. Quando a
// quantidade vendida excede o que a última compra tinha disponível, o restante é
// puxado das compras anteriores (mais recentes primeiro).
async function buildSaleItemsWithCost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: SaleItemInput[],
  options: { asOfCreatedAt?: string; excludeSaleId?: string } = {},
) {
  const asOf = options.asOfCreatedAt ?? new Date().toISOString();
  const productIds = [...new Set(items.map((item) => item.product_id))];

  const [{ data: entries, error: entriesError }, { data: saleItems, error: saleItemsError }] =
    await Promise.all([
      supabase
        .from("cf_moto_stock_entries")
        .select("product_id, quantity, unit_value, created_at")
        .in("product_id", productIds),
      supabase
        .from("cf_moto_sale_items")
        .select("id, product_id, quantity, sale_id, cf_moto_sales!inner(created_at)")
        .in("product_id", productIds),
    ]);

  if (entriesError) {
    throw new Error(entriesError.message);
  }
  if (saleItemsError) {
    throw new Error(saleItemsError.message);
  }

  return items.map((item, index) => {
    const productEntries = (entries ?? []).filter(
      (entry) => entry.product_id === item.product_id && entry.created_at <= asOf,
    );
    const priorSaleItems = (saleItems ?? []).filter((saleItem) => {
      const sale = saleItem.cf_moto_sales as unknown as { created_at: string };
      return (
        saleItem.product_id === item.product_id &&
        saleItem.sale_id !== options.excludeSaleId &&
        sale.created_at < asOf
      );
    });

    const newSaleItemId = `__new_${index}`;
    const events: LedgerEvent[] = [
      ...productEntries.map((entry) => ({
        type: "entry" as const,
        createdAt: entry.created_at,
        quantity: Number(entry.quantity) || 0,
        unitValue: Number(entry.unit_value) || 0,
      })),
      ...priorSaleItems.map((saleItem) => ({
        type: "sale" as const,
        createdAt: (saleItem.cf_moto_sales as unknown as { created_at: string }).created_at,
        saleItemId: saleItem.id,
        quantity: Number(saleItem.quantity) || 0,
      })),
      { type: "sale" as const, createdAt: asOf, saleItemId: newSaleItemId, quantity: item.quantity },
    ];

    const costs = computeLifoCosts(events);

    return {
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: costs.get(newSaleItemId) ?? 0,
    };
  });
}

// Preview (sem gravar nada) do custo LIFO de uma lista de itens, usado pelo modal
// de venda para exibir o custo real antes de salvar.
export async function previewCfMotoSaleItemsCost(
  items: SaleItemInput[],
  options: { excludeSaleId?: string; asOfCreatedAt?: string } = {},
) {
  const supabase = await createClient();
  return buildSaleItemsWithCost(supabase, items, options);
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

  await assertStockAvailable(supabase, items);

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
    const { data: existingSale, error: existingSaleError } = await supabase
      .from("cf_moto_sales")
      .select("created_at")
      .eq("id", id)
      .single();

    if (existingSaleError) {
      throw new Error(existingSaleError.message);
    }

    await assertStockAvailable(supabase, items, id);

    itemsWithCost = await buildSaleItemsWithCost(supabase, items, {
      asOfCreatedAt: existingSale.created_at,
      excludeSaleId: id,
    });
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
