"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsStockEntryInput, LsStockExitInput, StockExitReason } from "@/lib/types";
import { STOCK_EXIT_REASONS } from "@/lib/types";

function parseLsStockEntryInput(formData: FormData): LsStockEntryInput {
  return {
    product_id: String(formData.get("product_id") ?? ""),
    supplier_id: formData.get("supplier_id") ? String(formData.get("supplier_id")) : null,
    quantity: Number(formData.get("quantity")) || 0,
    unit_value: Number(formData.get("unit_value")) || 0,
    entry_date: String(formData.get("entry_date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

type LsStockEntryItemInput = { product_id: string; quantity: number; unit_value: number };

function parseEntryItems(formData: FormData): LsStockEntryItemInput[] {
  const raw = String(formData.get("items") ?? "");
  if (!raw) return [];

  let items: LsStockEntryItemInput[];
  try {
    const parsed = JSON.parse(raw) as {
      product_id?: unknown;
      quantity?: unknown;
      unit_value?: unknown;
    }[];
    items = parsed
      .map((item) => ({
        product_id: String(item.product_id ?? ""),
        quantity: Number(item.quantity) || 0,
        unit_value: Number(item.unit_value) || 0,
      }))
      .filter((item) => item.product_id && item.quantity > 0);
  } catch {
    return [];
  }

  const productIds = items.map((item) => item.product_id);
  if (new Set(productIds).size !== productIds.length) {
    throw new Error("Um mesmo produto não pode aparecer em mais de um item da entrada");
  }

  return items;
}

// Devolução ao fornecedor tem tela própria (/devolucoes), pois sempre exige
// fornecedor e valor de crédito — aqui só ficam os motivos genéricos.
const GENERIC_STOCK_EXIT_REASONS = STOCK_EXIT_REASONS.filter(
  (reason) => reason !== "devolucao_fornecedor",
);

function parseLsStockExitInput(formData: FormData): LsStockExitInput {
  const reason = String(formData.get("reason") ?? "");

  return {
    product_id: String(formData.get("product_id") ?? ""),
    quantity: Number(formData.get("quantity")) || 0,
    reason: (GENERIC_STOCK_EXIT_REASONS as readonly string[]).includes(reason)
      ? (reason as StockExitReason)
      : "ajuste_estoque",
    exit_date: String(formData.get("exit_date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    supplier_id: null,
    credit_amount: 0,
  };
}

// Garante que a quantidade de saída não passe do estoque disponível agora. Ao
// editar uma saída, devolve ao saldo disponível a quantidade que ela já consumia.
async function assertExitStockAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  quantity: number,
  excludeExitId?: string,
) {
  const { data: summary, error } = await supabase
    .from("ls_stock_summary")
    .select("product_name, quantity")
    .eq("product_id", productId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  let available = Number(summary.quantity) || 0;

  if (excludeExitId) {
    const { data: existing, error: existingError } = await supabase
      .from("ls_stock_exits")
      .select("quantity")
      .eq("id", excludeExitId)
      .single();

    if (existingError) {
      throw new Error(existingError.message);
    }

    available += Number(existing.quantity) || 0;
  }

  if (quantity > available) {
    throw new Error(
      `Quantidade maior que o estoque disponível de "${summary.product_name}" (${available})`,
    );
  }
}

export async function createLsStockEntries(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shared = parseLsStockEntryInput(formData);
  const items = parseEntryItems(formData);
  if (items.length === 0) {
    throw new Error("Adicione ao menos um item à entrada");
  }

  const { error } = await supabase.from("ls_stock_entries").insert(
    items.map((item) => ({
      ...shared,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_value: item.unit_value,
      created_by: user?.id,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/entradas");
  revalidatePath("/vendas");
}

export async function updateLsStockEntry(id: string, formData: FormData) {
  const supabase = await createClient();
  const entry = parseLsStockEntryInput(formData);

  const { error } = await supabase.from("ls_stock_entries").update(entry).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/entradas");
  revalidatePath("/vendas");
}

export async function deleteLsStockEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_stock_entries").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/entradas");
  revalidatePath("/vendas");
}

export async function createLsStockExit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const exit = parseLsStockExitInput(formData);
  await assertExitStockAvailable(supabase, exit.product_id, exit.quantity);

  const { error } = await supabase
    .from("ls_stock_exits")
    .insert({ ...exit, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/entradas");
  revalidatePath("/vendas");
}

export async function updateLsStockExit(id: string, formData: FormData) {
  const supabase = await createClient();
  const exit = parseLsStockExitInput(formData);
  await assertExitStockAvailable(supabase, exit.product_id, exit.quantity, id);

  const { error } = await supabase.from("ls_stock_exits").update(exit).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/entradas");
  revalidatePath("/vendas");
}

export async function deleteLsStockExit(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_stock_exits").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/entradas");
  revalidatePath("/vendas");
}
