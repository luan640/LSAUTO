"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsProductInput } from "@/lib/types";

function parseLsProductInput(formData: FormData): LsProductInput {
  const brandId = String(formData.get("brand_id") ?? "");

  return {
    name: String(formData.get("name") ?? "").trim().toUpperCase(),
    sku: String(formData.get("sku") ?? "").replace(/\s+/g, "").toUpperCase(),
    brand_id: brandId || null,
  };
}

export async function createLsProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const product = parseLsProductInput(formData);

  const { error } = await supabase
    .from("ls_products")
    .insert({ ...product, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/produtos");
}

export async function updateLsProduct(id: string, formData: FormData) {
  const supabase = await createClient();
  const product = parseLsProductInput(formData);

  const { error } = await supabase.from("ls_products").update(product).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/produtos");
}

// Produto nunca é excluído de fato (apagaria o histórico de entradas/vendas
// vinculado); "excluir" na tela só desativa, tirando o produto das opções de
// venda sem perder o rastro do que já foi movimentado com ele.
export async function setLsProductActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_products").update({ active }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/produtos");
}
