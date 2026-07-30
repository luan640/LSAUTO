"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CfMotoStockEntryInput, CfMotoSupplierInput } from "@/lib/types";

function parseCfMotoStockEntryInput(formData: FormData): CfMotoStockEntryInput {
  return {
    product_id: String(formData.get("product_id") ?? ""),
    supplier_id: formData.get("supplier_id") ? String(formData.get("supplier_id")) : null,
    quantity: Number(formData.get("quantity")) || 0,
    unit_value: Number(formData.get("unit_value")) || 0,
    entry_date: String(formData.get("entry_date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export async function createCfMotoStockEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entry = parseCfMotoStockEntryInput(formData);

  const { error } = await supabase
    .from("cf_moto_stock_entries")
    .insert({ ...entry, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/entradas");
  revalidatePath("/cf-motos/estoque");
}

export async function updateCfMotoStockEntry(id: string, formData: FormData) {
  const supabase = await createClient();
  const entry = parseCfMotoStockEntryInput(formData);

  const { error } = await supabase.from("cf_moto_stock_entries").update(entry).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/entradas");
  revalidatePath("/cf-motos/estoque");
}

export async function deleteCfMotoStockEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cf_moto_stock_entries").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/entradas");
  revalidatePath("/cf-motos/estoque");
}

export async function createCfMotoSupplier(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const supplier: CfMotoSupplierInput = {
    name: String(formData.get("name") ?? ""),
    contact: String(formData.get("contact") ?? ""),
  };

  const { data, error } = await supabase
    .from("cf_moto_suppliers")
    .insert({ ...supplier, created_by: user?.id })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/entradas");

  return data;
}
