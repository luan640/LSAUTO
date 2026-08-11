"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsProductInput } from "@/lib/types";

function parseLsProductInput(formData: FormData): LsProductInput {
  return {
    name: String(formData.get("name") ?? ""),
    sku: String(formData.get("sku") ?? ""),
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

export async function deleteLsProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_products").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Não é possível excluir: este produto já tem entradas ou vendas registradas no estoque.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/produtos");
}
