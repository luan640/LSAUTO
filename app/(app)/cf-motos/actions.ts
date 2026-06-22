"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CfMotoSaleInput } from "@/lib/types";

function parseCfMotoSaleInput(formData: FormData): CfMotoSaleInput {
  return {
    sale_date: String(formData.get("sale_date") ?? ""),
    sale_value: Number(formData.get("sale_value")) || 0,
    cost: Number(formData.get("cost")) || 0,
    shopee_fee: Number(formData.get("shopee_fee")) || 0,
    product_reference: String(formData.get("product_reference") ?? "").trim(),
  };
}

function toFriendlyError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Este link de venda já foi cadastrado");
  }
  return new Error(error.message);
}

export async function createCfMotoSale(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sale = parseCfMotoSaleInput(formData);

  const { error } = await supabase
    .from("cf_moto_sales")
    .insert({ ...sale, created_by: user?.id });

  if (error) {
    throw toFriendlyError(error);
  }

  revalidatePath("/cf-motos");
}

export async function updateCfMotoSale(id: string, formData: FormData) {
  const supabase = await createClient();
  const sale = parseCfMotoSaleInput(formData);

  const { error } = await supabase.from("cf_moto_sales").update(sale).eq("id", id);

  if (error) {
    throw toFriendlyError(error);
  }

  revalidatePath("/cf-motos");
}

export async function deleteCfMotoSale(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cf_moto_sales").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos");
}
