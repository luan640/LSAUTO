"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsStockEntryInput } from "@/lib/types";

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
