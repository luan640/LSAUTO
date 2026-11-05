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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// SKU é único entre todos os produtos, inclusive inativos: reaproveitar o SKU de
// um produto desativado criaria um segundo cadastro em vez de reativar o antigo.
async function assertSkuAvailable(supabase: SupabaseClient, sku: string, ignoreId?: string) {
  if (!sku) return;

  let query = supabase.from("ls_products").select("name, active").eq("sku", sku).limit(1);
  if (ignoreId) query = query.neq("id", ignoreId);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const existing = data?.[0];
  if (existing) {
    throw new Error(
      existing.active
        ? `Já existe um produto com o SKU ${sku}: ${existing.name}`
        : `Já existe um produto inativo com o SKU ${sku}: ${existing.name}. Reative-o em vez de cadastrar outro.`,
    );
  }
}

function toFriendlyError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("Já existe um produto com este SKU");
  }
  return new Error(error.message);
}

export async function createLsProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const product = parseLsProductInput(formData);
  await assertSkuAvailable(supabase, product.sku);

  const { error } = await supabase
    .from("ls_products")
    .insert({ ...product, created_by: user?.id });

  if (error) {
    throw toFriendlyError(error);
  }

  revalidatePath("/produtos");
}

export async function updateLsProduct(id: string, formData: FormData) {
  const supabase = await createClient();
  const product = parseLsProductInput(formData);
  await assertSkuAvailable(supabase, product.sku, id);

  const { error } = await supabase.from("ls_products").update(product).eq("id", id);

  if (error) {
    throw toFriendlyError(error);
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
