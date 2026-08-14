"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsBalanceAdjustmentInput } from "@/lib/types";

function parseLsBalanceAdjustmentInput(formData: FormData): LsBalanceAdjustmentInput {
  const type = String(formData.get("type") ?? "aumentar");
  const magnitude = Math.abs(Number(formData.get("amount")) || 0);

  return {
    description: String(formData.get("description") ?? ""),
    amount: type === "diminuir" ? -magnitude : magnitude,
  };
}

export async function createLsBalanceAdjustment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adjustment = parseLsBalanceAdjustmentInput(formData);

  const { error } = await supabase
    .from("ls_balance_adjustments")
    .insert({ ...adjustment, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ajuste-monetario");
  revalidatePath("/dashboard");
}

export async function updateLsBalanceAdjustment(id: string, formData: FormData) {
  const supabase = await createClient();
  const adjustment = parseLsBalanceAdjustmentInput(formData);

  const { error } = await supabase
    .from("ls_balance_adjustments")
    .update(adjustment)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ajuste-monetario");
  revalidatePath("/dashboard");
}

export async function deleteLsBalanceAdjustment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_balance_adjustments").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ajuste-monetario");
  revalidatePath("/dashboard");
}
