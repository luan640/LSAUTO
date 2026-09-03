"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SaleInput } from "@/lib/types";
import { computeLifoCosts, type LedgerEvent } from "@/lib/stock/lifo-cost";

function parseSaleInput(formData: FormData): SaleInput {
  const customerId = String(formData.get("customer_id") ?? "");

  return {
    sale_date: String(formData.get("sale_date")),
    sale_value: Number(formData.get("sale_value")),
    discount: Number(formData.get("discount")) || 0,
    payment_method: String(formData.get("payment_method")) as SaleInput["payment_method"],
    delivery_type: String(formData.get("delivery_type")) as SaleInput["delivery_type"],
    cost: Number(formData.get("cost")) || 0,
    products: String(formData.get("products") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    receipt_notes: String(formData.get("receipt_notes") ?? ""),
    customer_id: customerId || null,
  };
}

export type SaleItemInput = { product_id: string; quantity: number };

function parseSaleItems(formData: FormData): SaleItemInput[] {
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
        .from("ls_stock_summary")
        .select("product_id, product_name, quantity")
        .in("product_id", productIds),
      excludeSaleId
        ? supabase.from("ls_sale_items").select("product_id, quantity").eq("sale_id", excludeSaleId)
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

// Simula o consumo de estoque em pilha (LIFO) com base no estado atual do estoque
// (todas as entradas, vendas e saídas já registradas) e monta os itens com o custo
// resultante. Quando a quantidade vendida excede o que a última compra tinha
// disponível, o restante é puxado das compras anteriores (mais recentes primeiro).
async function buildSaleItemsWithCost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: SaleItemInput[],
  options: { excludeSaleId?: string } = {},
) {
  const asOf = new Date().toISOString();
  const productIds = [...new Set(items.map((item) => item.product_id))];

  const [
    { data: entries, error: entriesError },
    { data: saleItems, error: saleItemsError },
    { data: exits, error: exitsError },
  ] = await Promise.all([
    supabase
      .from("ls_stock_entries")
      .select("product_id, quantity, unit_value, created_at")
      .in("product_id", productIds),
    supabase
      .from("ls_sale_items")
      .select("id, product_id, quantity, sale_id, sales!inner(created_at)")
      .in("product_id", productIds),
    supabase
      .from("ls_stock_exits")
      .select("id, product_id, quantity, created_at")
      .in("product_id", productIds),
  ]);

  if (entriesError) {
    throw new Error(entriesError.message);
  }
  if (saleItemsError) {
    throw new Error(saleItemsError.message);
  }
  if (exitsError) {
    throw new Error(exitsError.message);
  }

  return items.map((item, index) => {
    const productEntries = (entries ?? []).filter(
      (entry) => entry.product_id === item.product_id && entry.created_at <= asOf,
    );
    const priorSaleItems = (saleItems ?? []).filter((saleItem) => {
      const sale = saleItem.sales as unknown as { created_at: string };
      return (
        saleItem.product_id === item.product_id &&
        saleItem.sale_id !== options.excludeSaleId &&
        sale.created_at < asOf
      );
    });
    const priorExits = (exits ?? []).filter(
      (exit) => exit.product_id === item.product_id && exit.created_at < asOf,
    );

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
        createdAt: (saleItem.sales as unknown as { created_at: string }).created_at,
        saleItemId: saleItem.id,
        quantity: Number(saleItem.quantity) || 0,
      })),
      ...priorExits.map((exit) => ({
        type: "sale" as const,
        createdAt: exit.created_at,
        saleItemId: `__exit_${exit.id}`,
        quantity: Number(exit.quantity) || 0,
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
export async function previewSaleItemsCost(
  items: SaleItemInput[],
  options: { excludeSaleId?: string } = {},
) {
  const supabase = await createClient();
  return buildSaleItemsWithCost(supabase, items, options);
}

async function buildProductsSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: SaleItemInput[],
) {
  const productIds = [...new Set(items.map((item) => item.product_id))];
  const { data: products, error } = await supabase
    .from("ls_products")
    .select("id, name")
    .in("id", productIds);

  if (error) {
    throw new Error(error.message);
  }

  const nameById = new Map((products ?? []).map((product) => [product.id, product.name]));

  return items
    .map((item) => `${item.quantity}x ${nameById.get(item.product_id) ?? "Produto"}`)
    .join(", ");
}

export async function createSale(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = parseSaleItems(formData);
  if (items.length === 0) {
    throw new Error("Selecione ao menos um produto do estoque e a quantidade");
  }

  await assertStockAvailable(supabase, items);

  const itemsWithCost = await buildSaleItemsWithCost(supabase, items);
  const computedCost = itemsWithCost.reduce(
    (acc, item) => acc + item.quantity * item.unit_cost,
    0,
  );

  const sale = parseSaleInput(formData);
  sale.cost = computedCost;
  sale.products = await buildProductsSummary(supabase, items);

  const { data: inserted, error } = await supabase
    .from("sales")
    .insert({ ...sale, created_by: user?.id })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: itemsError } = await supabase
    .from("ls_sale_items")
    .insert(itemsWithCost.map((item) => ({ ...item, sale_id: inserted.id })));

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
}

export async function updateSale(id: string, formData: FormData) {
  const supabase = await createClient();
  const items = parseSaleItems(formData);
  const sale = parseSaleInput(formData);

  if (items.length > 0) {
    await assertStockAvailable(supabase, items, id);

    const itemsWithCost = await buildSaleItemsWithCost(supabase, items, {
      excludeSaleId: id,
    });
    sale.cost = itemsWithCost.reduce((acc, item) => acc + item.quantity * item.unit_cost, 0);
    sale.products = await buildProductsSummary(supabase, items);

    const { error } = await supabase.from("sales").update(sale).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("ls_sale_items")
      .delete()
      .eq("sale_id", id);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { error: itemsError } = await supabase
      .from("ls_sale_items")
      .insert(itemsWithCost.map((item) => ({ ...item, sale_id: id })));
    if (itemsError) {
      throw new Error(itemsError.message);
    }
  } else {
    const { error } = await supabase.from("sales").update(sale).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
}

// Cancela uma venda: marca o status como cancelado e grava o motivo informado.
// Quando a venda tem itens de estoque vinculados (modelo novo, itemizado), cada
// item volta ao estoque através de uma nova entrada (para manter rastreável de
// onde veio). Vendas antigas (texto livre, sem itens) só ficam marcadas como
// canceladas, já que não há item de estoque associado para devolver.
export async function cancelSale(id: string, reason: string) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error("Informe o motivo do cancelamento");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id, status")
    .eq("id", id)
    .single();

  if (saleError) {
    throw new Error(saleError.message);
  }
  if (sale.status === "cancelado") {
    throw new Error("Esta venda já está cancelada");
  }

  const { data: items, error: itemsError } = await supabase
    .from("ls_sale_items")
    .select("product_id, quantity, unit_cost")
    .eq("sale_id", id);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const { error: statusError } = await supabase
    .from("sales")
    .update({ status: "cancelado", cancel_reason: trimmedReason })
    .eq("id", id);

  if (statusError) {
    throw new Error(statusError.message);
  }

  if (items && items.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: returnError } = await supabase.from("ls_stock_entries").insert(
      items.map((item) => ({
        product_id: item.product_id,
        supplier_id: null,
        quantity: item.quantity,
        unit_value: item.unit_cost,
        entry_date: today,
        notes: `Devolução por cancelamento de venda: ${trimmedReason}`,
        created_by: user?.id,
      })),
    );

    if (returnError) {
      throw new Error(returnError.message);
    }

    revalidatePath("/entradas");
  }

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
}
