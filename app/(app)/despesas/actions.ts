"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseInput } from "@/lib/types";

function parseExpenseInput(formData: FormData): ExpenseInput {
  return {
    description: String(formData.get("description") ?? ""),
    amount: Number(formData.get("amount")) || 0,
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
  };
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expense = parseExpenseInput(formData);

  const { error } = await supabase
    .from("expenses")
    .insert({ ...expense, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/despesas");
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient();
  const expense = parseExpenseInput(formData);

  const { error } = await supabase.from("expenses").update(expense).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/despesas");
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/despesas");
}
