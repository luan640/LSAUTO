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

export async function createLsStockEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entry = parseLsStockEntryInput(formData);

  const { error } = await supabase
    .from("ls_stock_entries")
    .insert({ ...entry, created_by: user?.id });

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
