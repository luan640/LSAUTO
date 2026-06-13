"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BudgetItemInput } from "@/lib/types";

function parseItems(formData: FormData): BudgetItemInput[] {
  const raw = String(formData.get("items") ?? "[]");
  const items = JSON.parse(raw) as Array<{
    product_reference?: string;
    supplier_id?: string | null;
    purchase_value?: number;
    sale_value?: number;
  }>;

  return items.map((item) => ({
    product_reference: String(item.product_reference ?? ""),
    supplier_id: item.supplier_id || null,
    purchase_value: Number(item.purchase_value) || 0,
    sale_value: Number(item.sale_value) || 0,
  }));
}

export async function createBudget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const client_phone = String(formData.get("client_phone") ?? "");
  const budget_date = String(formData.get("budget_date"));
  const items = parseItems(formData);

  const { data: budget, error } = await supabase
    .from("budgets")
    .insert({ client_phone, budget_date, created_by: user?.id })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("budget_items")
      .insert(items.map((item) => ({ ...item, budget_id: budget.id })));

    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  revalidatePath("/orcamentos");
}

export async function updateBudget(id: string, formData: FormData) {
  const supabase = await createClient();

  const client_phone = String(formData.get("client_phone") ?? "");
  const budget_date = String(formData.get("budget_date"));
  const items = parseItems(formData);

  const { error } = await supabase
    .from("budgets")
    .update({ client_phone, budget_date })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  const { error: deleteError } = await supabase
    .from("budget_items")
    .delete()
    .eq("budget_id", id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("budget_items")
      .insert(items.map((item) => ({ ...item, budget_id: id })));

    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  revalidatePath("/orcamentos");
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/orcamentos");
}
