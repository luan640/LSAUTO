"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SaleInput } from "@/lib/types";

function parseSaleInput(formData: FormData): SaleInput {
  return {
    sale_date: String(formData.get("sale_date")),
    sale_value: Number(formData.get("sale_value")),
    payment_method: String(formData.get("payment_method")) as SaleInput["payment_method"],
    delivery_type: String(formData.get("delivery_type")) as SaleInput["delivery_type"],
    cost: Number(formData.get("cost")),
    products: String(formData.get("products") ?? ""),
  };
}

export async function createSale(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sale = parseSaleInput(formData);

  const { error } = await supabase
    .from("sales")
    .insert({ ...sale, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
}

export async function updateSale(id: string, formData: FormData) {
  const supabase = await createClient();
  const sale = parseSaleInput(formData);

  const { error } = await supabase.from("sales").update(sale).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
}

export async function deleteSale(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sales").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
}
