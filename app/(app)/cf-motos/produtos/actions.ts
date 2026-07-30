"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CfMotoProductInput } from "@/lib/types";

function parseCfMotoProductInput(formData: FormData): CfMotoProductInput {
  return {
    name: String(formData.get("name") ?? ""),
    sku: String(formData.get("sku") ?? ""),
  };
}

export async function createCfMotoProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const product = parseCfMotoProductInput(formData);

  const { error } = await supabase
    .from("cf_moto_products")
    .insert({ ...product, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/produtos");
}

export async function updateCfMotoProduct(id: string, formData: FormData) {
  const supabase = await createClient();
  const product = parseCfMotoProductInput(formData);

  const { error } = await supabase.from("cf_moto_products").update(product).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/produtos");
}

export async function deleteCfMotoProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cf_moto_products").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Não é possível excluir: este produto já tem entradas ou vendas registradas no estoque.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/cf-motos/produtos");
}
