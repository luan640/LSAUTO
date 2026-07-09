"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CfMotoExpenseInput } from "@/lib/types";

function parseCfMotoExpenseInput(formData: FormData): CfMotoExpenseInput {
  return {
    description: String(formData.get("description") ?? ""),
    amount: Number(formData.get("amount")) || 0,
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
  };
}

export async function createCfMotoExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expense = parseCfMotoExpenseInput(formData);

  const { error } = await supabase
    .from("cf_moto_expenses")
    .insert({ ...expense, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/despesas");
}

export async function updateCfMotoExpense(id: string, formData: FormData) {
  const supabase = await createClient();
  const expense = parseCfMotoExpenseInput(formData);

  const { error } = await supabase.from("cf_moto_expenses").update(expense).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/despesas");
}

export async function deleteCfMotoExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cf_moto_expenses").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/despesas");
}
